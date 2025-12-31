// src/controllers/offers.js
import { LRUCache } from "lru-cache";
import * as CouponsRepo from "../dbhelper/CouponsRepoPublic.js";
import { supabase } from "../dbhelper/dbclient.js";
import * as StoresRepo from "../dbhelper/StoresRepoPublic.js";

/**
 * POST /api/offers/:offerId/click
 */

// create a single global LRU rate cache (max keys + ttl)
if (!global.__offerClickRateCache) {
  // keep up to 50k keys, entries expire after 60s
  global.__offerClickRateCache = new LRUCache({ max: 50000, ttl: 60 * 1000 });
}
const rateCache = global.__offerClickRateCache;

// Heuristics to detect coupon primary keys that safely map to your coupons table.
// Accept plain integer IDs or UUIDs. Anything else is treated as a non-coupon (block) id.
const isLikelyCouponId = (id) => {
  if (!id || typeof id !== "string") return false;
  if (/^\d+$/.test(id)) return true; // numeric pk
  // UUID v4-ish detection (hex-8-4-4-12)
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return true;
  return false;
};

export async function click(req, res) {
  try {
    const offerIdRaw = String(req.params.offerId || "").trim();
    if (!offerIdRaw) {
      return res.status(400).json({ ok: false, message: "Invalid offer id" });
    }
    const offerId = offerIdRaw;

    // ------- robust IP extraction -------
    const forwarded = req.headers["x-forwarded-for"];
    const ipFromHeader = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = (
      ipFromHeader ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown"
    )
      .toString()
      .split(",")[0]
      .trim();

    // --------- Simple LRU-based rate limiter (per IP + offer) ----------
    const MAX_REQUESTS_PER_WINDOW = 12; // adjust as needed
    const key = `${ip}:${offerId}`;
    const cur = (rateCache.get(key) || 0) + 1;
    rateCache.set(key, cur);
    if (cur > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        ok: false,
        message: "Too many requests, please try again later",
      });
    }
    // ------------------------------------------------------------------

    // NOTE: avoid calling CouponsRepo.getById for prefixed/compound ids (like h2-..., trending-..., etc.)
    // First detect if it's likely a real coupon id; if so, call CouponsRepo.getById, else fallback to merchant-block parsing.
    let offer = null;
    let source = null; // "coupon" | "merchant-block"

    if (isLikelyCouponId(offerId)) {
      try {
        offer = await CouponsRepo.getById(offerId);
        if (offer) source = "coupon";
      } catch (dbErr) {
        // defensive: log and continue to merchant-block fallback (do not crash)
        console.warn(
          "CouponsRepo.getById error (continuing to fallback):",
          dbErr
        );
        offer = null;
        source = null;
      }
    }

    if (!offer) {
      // ===== Recognize IDs:
      //  - trending-<merchantId>-<1-based-index>
      //  - h2-<merchantId>-<0-based-index> or h3-<merchantId>-<0-based-index>
      //  - legacy: merchant-<id>-h2-<index> or plain merchant id
      let parsed = null;

      const trendingMatch = offerId.match(/^trending-(\d+)-(\d+)$/i);
      if (trendingMatch) {
        parsed = {
          type: "trending",
          merchantId: trendingMatch[1],
          index1: Number(trendingMatch[2]), // 1-based
        };
      } else {
        const prefixMatch = offerId.match(/^(h[23])-(\d+)-(\d+)$/i);
        if (prefixMatch) {
          parsed = {
            type: "block",
            kind: prefixMatch[1].toLowerCase(), // "h2" or "h3"
            merchantId: prefixMatch[2],
            index: Number(prefixMatch[3]), // 0-based
          };
        } else {
          const legacyMatch = offerId.match(
            /^(?:merchant[:\-])?(\d+)(?:[:\-]h([23])[:\-]?(\d+))?$/i
          );
          if (legacyMatch) {
            parsed = {
              type: legacyMatch[2] ? "block" : "merchant",
              kind: legacyMatch[2] ? `h${legacyMatch[2]}` : null,
              merchantId: legacyMatch[1],
              index:
                legacyMatch[3] !== undefined ? Number(legacyMatch[3]) : null,
            };
          }
        }
      }

      if (parsed && parsed.merchantId) {
        try {
          // Try SDK repo first; fall back to direct supabase fetch if repo lacks getById behavior.
          let store = null;
          if (typeof StoresRepo.getById === "function") {
            try {
              store = await StoresRepo.getById(parsed.merchantId);
            } catch (e) {
              store = null;
            }
          }

          if (!store) {
            const { data: sdata, error: sErr } = await supabase
              .from("merchants")
              .select(
                "id, slug, name, aff_url, web_url, logo_url, coupon_h2_blocks, coupon_h3_blocks"
              )
              .eq("id", parsed.merchantId)
              .maybeSingle();
            if (!sErr && sdata) store = sdata;
          }

          if (store) {
            let chosen = null;

            if (parsed.type === "trending") {
              const combined = [
                ...(store.coupon_h2_blocks || []),
                ...(store.coupon_h3_blocks || []),
              ];
              const idx0 = Math.max(0, Number(parsed.index1 || 1) - 1);
              chosen = combined[idx0] ?? null;
            } else if (parsed.type === "block") {
              const arr =
                parsed.kind === "h2"
                  ? store.coupon_h2_blocks || []
                  : store.coupon_h3_blocks || [];
              chosen = arr[parsed.index] ?? null;
            } else {
              chosen =
                (Array.isArray(store.coupon_h2_blocks) &&
                  store.coupon_h2_blocks[0]) ||
                (Array.isArray(store.coupon_h3_blocks) &&
                  store.coupon_h3_blocks[0]) ||
                null;
            }

            if (chosen) {
              source = "merchant-block";
              offer = {
                id: offerId,
                title:
                  chosen.heading || chosen.title || `Offer from ${store.name}`,
                description: chosen.description || "",
                coupon_type: "deal",
                merchant_id: store.id,
                merchant: {
                  id: store.id,
                  slug: store.slug,
                  name: store.name,
                  aff_url: store.aff_url ?? store.affl_url ?? null,
                  web_url: store.web_url ?? store.website ?? null,
                  logo_url: store.logo_url ?? null,
                },
                code: null,
                redirect_url: chosen.redirect_url ?? null,
                block: {
                  kind:
                    parsed.type === "trending"
                      ? Array.isArray(store.coupon_h2_blocks) &&
                        store.coupon_h2_blocks.length
                        ? "h2"
                        : "h3"
                      : parsed.kind ||
                        (Array.isArray(store.coupon_h2_blocks) ? "h2" : "h3"),
                  index:
                    parsed.type === "trending"
                      ? Math.max(0, Number(parsed.index1 || 1) - 1)
                      : Number.isFinite(parsed.index)
                      ? parsed.index
                      : 0,
                  raw: chosen,
                },
              };
            }
          }
        } catch (err) {
          console.warn(
            "StoresRepo / supabase fetch failed for parsed id:",
            offerId,
            err
          );
        }
      }
    }

    if (!offer) {
      return res.status(404).json({ ok: false, message: "Offer not found" });
    }

    // Determine redirect_url priority: server-provided redirect_url (block) -> aff_url -> web_url -> null
    const merch = offer.merchant || {};
    const serverRedirect = offer.redirect_url || null;
    const aff = merch.aff_url || merch.affl_url || null;
    const web = merch.web_url || null;

    let redirectUrl = null;
    const pick = serverRedirect || aff || web || null;
    if (pick && (pick.startsWith("http://") || pick.startsWith("https://"))) {
      redirectUrl = pick;
    } else {
      redirectUrl = null;
    }

    // Increment click count (repo handles RPC/fallback)
    // Only increment for real coupons stored in coupons table
    try {
      if (source === "coupon") {
        await CouponsRepo.incrementClickCount(offerId);
      } else {
        // merchant-block: intentionally do NOT maintain click_count per decision
      }
    } catch (e) {
      console.warn("incrementClick failed for", offerId, e);
    }

    // Best-effort audit insert (fire-and-forget, non-blocking)
    (async () => {
      try {
        await supabase.from("offer_clicks").insert([
          {
            offer_id: offerId,
            merchant_id: offer.merchant_id || merch.id || null,
            ip: ip,
            user_agent: req.headers["user-agent"] || null,
            created_at: new Date().toISOString(),
            source: source,
            block_meta: offer.block ? JSON.stringify(offer.block) : null,
          },
        ]);
      } catch (auditErr) {
        console.warn("Failed to insert audit offer_clicks record:", auditErr);
      }
    })();

    // Prepare response
    const code = offer.code || null;

    return res.status(200).json({
      ok: true,
      code,
      redirect_url: redirectUrl,
      message: "Click recorded",
    });
  } catch (err) {
    console.error("offers.click controller error:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Failed to record click" });
  }
}
