// controllers/publicStores.js
import * as StoresRepo from "../dbhelper/StoresRepoPublic.js";
import * as CouponsRepo from "../dbhelper/CouponsRepoPublic.js";
import { ok, fail, notFound } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import {
  valPage,
  valLimit,
  valEnum,
  valLocale,
  deriveLocale,
} from "../utils/validation.js";
import { badRequest } from "../utils/errors.js";
import { STORE_SORTS, STORE_COUPON_TYPES } from "../constants/publicEnums.js";
import DOMPurify from "isomorphic-dompurify";
import { getOrigin, getPath } from "../utils/request-helper.js";
import { makeListCacheKey } from "../utils/cacheKey.js";
import { buildStoreSchema } from "../utils/buildStoreSchema.js";

const SITE_URL = "geniecoupon.com";

/**
 * GET /public/v1/stores
 * Cursor-based pagination
 */
export async function list(req, res) {
  try {
    const limit = valLimit(req.query.limit); // page param removed
    const sort = valEnum(req.query.sort, STORE_SORTS, "newest");
    const locale = valLocale(req.query.locale) || deriveLocale(req);
    const qRaw = String(req.query.q || "");
    const q = qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw;
    const categorySlug = String(req.query.category || "").trim();
    const letter = String(req.query.letter || "All").trim();
    const cursor = String(req.query.cursor || null);

    const seasonSlug = req.query.season
      ? String(req.query.season).trim().toLowerCase()
      : null;

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));
    const mode = req.query.mode || "default";

    const params = {
      q: q.trim(),
      categorySlug,
      sort,
      locale,
      limit,
      origin,
      path,
      seasonSlug,
      letter,
      mode,
      cursor,
    };
    0;
    const cacheKey = makeListCacheKey("stores", {
      limit,
      q: params.q || "",
      category: params.categorySlug || "",
      sort: params.sort || "",
      locale: params.locale || "",
      season: params.seasonSlug || "",
      letter: params.letter || "",
      cursor: params.cursor || "",
      mode: params.mode || "",
    });

    const result = await withCache(
      req,
      async () => {
        // Call repo for cursor-based listing
        const { rows, total, nextCursor } = await StoresRepo.list(params);

        // Build canonical (may be async)
        const canonical = `https://${SITE_URL}/stores?sort=${sort}&limit=${limit}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`;

        return {
          data: rows,
          meta: {
            limit,
            total,
            canonical,
            nextCursor, // cursor for frontend infinite scroll
          },
        };
      },
      { ttlSeconds: 60, keyExtra: cacheKey },
    );

    return ok(res, result);
  } catch (e) {
    console.error("Stores list controller error:", e);
    return fail(res, "Failed to list stores", e);
  }
}

/** Store Detail — enriched for frontend needs
 *
 */
export async function detail(req, res) {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) return badRequest(res, "Invalid store slug");

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));
    const page = valPage(req.query.page);
    const limit = valLimit(req.query.limit);
    const type = valEnum(req.query.type, STORE_COUPON_TYPES, "all");
    const sort = valEnum(
      req.query.sort,
      ["editor", "latest", "ending"],
      "editor",
    );
    const locale = valLocale(req.query.locale) || deriveLocale(req);

    const params = {
      slug,
      type,
      sort,
      locale,
      page,
      limit,
      origin,
      path,
    };

    const cacheKey = makeListCacheKey("stores", {
      page,
      limit,
      q: params.q || "",
      category: params.categorySlug || "",
      sort: params.sort || "",
      locale: params.locale || "",
      type: params.type || "",
    });

    const result = await withCache(
      req,
      async () => {
        // Fetch store (single fast lookup)
        const store = await StoresRepo.getBySlug(params.slug);
        if (!store) return { data: null, meta: { status: 404 } };

        // Prepare parallel promises
        const couponsPromise = CouponsRepo.listForStore({
          merchantId: store.id,
          type,
          page,
          limit,
          sort,
          skipCount: false,
        }).catch((e) => {
          console.warn("Coupons listForStore failed:", e);
          return { items: [], total: 0 };
        });

        const relatedPromise = StoresRepo.relatedByCategories({
          merchantId: store.id,
          category_id: store.category_id || null,
          subcategory_id: store.subcategory_id || null,
          limit: 9,
        }).catch((e) => {
          console.warn("relatedByCategories failed:", e);
          return [];
        });

        const clickCountPromise = StoresRepo.sumClickCount(store.id).catch(
          (e) => {
            console.warn("sumClickCount failed:", e);
            return 0;
          },
        );

        const proofsPromise = StoresRepo.fetchProofsByMerchantId(
          store.id,
        ).catch((e) => {
          console.warn("fetchProofsByMerchantId failed:", e);
          return [];
        });

        const [couponsResult, relatedResult, totalClicks, proofs] =
          await Promise.all([
            couponsPromise,
            relatedPromise,
            clickCountPromise,
            proofsPromise,
          ]);

        const extractDiscountScore = (title = "") => {
          const percentMatch = title.match(/(\d+)\s*%/);
          if (percentMatch) return parseInt(percentMatch[1], 10);

          const amountMatch = title.match(/\$\s?(\d{1,6})/);
          if (amountMatch) return parseInt(amountMatch[1], 10);

          return 0;
        };


        const rawItems =
          couponsResult && couponsResult.items ? couponsResult.items : [];
        let total =
          typeof couponsResult?.total === "number" ? couponsResult.total : 0;

        let couponsItems = [];

        if (total === 0) {
          // build H2 blocks (preserve index) then H3 blocks
          const h2 = (store.coupon_h2_blocks || []).map((b, idx) => ({
            id: `h2-${store.id}-${idx}`, // unique & parseable
            coupon_type: "deal",
            title: b.heading,
            description: b.description,
            type_text: "deal",
            code: null,
            ends_at: null,
            show_proof: false,
            proof_image_url: null,
            is_editor: false,
            click_count: 0, // you decided not to maintain counts for blocks
            merchant_id: store.id,
            merchant: {
              id: store.id,
              slug: store.slug,
              name: store.name,
              aff_url: store.aff_url,
              web_url: store.web_url,
              logo_url: store.logo_url,
            },
            _block_source: { kind: "h2", index: idx, raw: b }, // optional metadata
          }));

          const h3 = (store.coupon_h3_blocks || []).map((b, idx) => ({
            id: `h3-${store.id}-${idx}`,
            coupon_type: "deal",
            title: b.heading,
            description: b.description,
            type_text: "deal",
            code: null,
            ends_at: null,
            show_proof: false,
            proof_image_url: null,
            is_editor: false,
            click_count: 0,
            merchant_id: store.id,
            merchant: {
              id: store.id,
              slug: store.slug,
              name: store.name,
              aff_url: store.aff_url,
              web_url: store.web_url,
              logo_url: store.logo_url,
            },
            _block_source: { kind: "h3", index: idx, raw: b },
          }));

          // combine — you can control ordering here (h2 first then h3)
          couponsItems = [...h2, ...h3];

          store.active_coupons = couponsItems.length;
          total = couponsItems.length;
        } else {
          // 🔹 Use DB coupons
          couponsItems = (rawItems || []).map((r) => ({
            id: r.id,
            coupon_type: r.coupon_type,
            title: r.title,
            description: r.description,
            type_text: r.type_text,
            code: r.code || null,
            ends_at: r.ends_at,
            show_proof: !!r.show_proof,
            proof_image_url: r.proof_image_url || null,
            is_editor: !!r.is_editor,
            click_count: r.click_count || 0,
            discount_type: r.discount_type || null,
            discount_value: r.discount_value || null,
            merchant_id: r.merchant_id,
            merchant: r.merchant
              ? {
                  id: r.merchant.id,
                  slug: r.merchant.slug,
                  name: r.merchant.name,
                  aff_url: r.merchant.aff_url,
                  web_url: r.merchant.web_url,
                  logo_url: r.merchant.logo_url,
                }
              : null,
          }));
        }

        const related = relatedResult || [];

        // Normalize FAQs
        let faqs = normalizeFaqsFromColumn(store.faqs);
        faqs = faqs.map((f) => ({
          question: DOMPurify.sanitize(f.question),
          answer: DOMPurify.sanitize(f.answer),
        }));

        // Testimonials / ratings fallback (kept as before)
        let testimonials = [];
        let avgRating = null;
        let reviewsCount = 0;

        // const recentActivity = {
        //   total_offers: recentResult?.total || 0,
        //   recent: recentResult?.items || [],
        // };

        // canonical + seo
        const canonical = `https://${SITE_URL}/stores/${slug}`;

        const seo = StoresRepo.buildSeo(store, {
          canonical,
          locale: params.locale,
        });
        const breadcrumbs = StoresRepo.buildBreadcrumbs(store, params);

        //Build Store Schema with all available data (for frontend and SEO use)
        const jsonld = buildStoreSchema({
          store, // has web_url now
          seo,
          coupons: couponsItems,
          relatedStores: related,
          faqs, // all FAQs, no limit
          proofs, // proofs fetched client-side in astro; pass [] here
          totalSavings: 0, // computed in [slug].astro — pass 0 here, astro will override
          totalClicks,
          generatedAt: new Date().toISOString(),
        });

        const side_description_html =
          store.side_description_html || store.summary_html || null;
        const description_html =
          store.description_html || store.about_html || null;

        return {
          data: {
            id: store.id,
            slug: store.slug,
            name: store.name,
            logo_url: store.logo_url,
            category_id: store.category_id || null,
            subcategory_id: store.subcategory_id || null,
            seo,
            breadcrumbs,
            side_description_html,
            description_html,
            about_html: store.about_html || null,
            stats: { active_coupons: store.active_coupons || 0 },
            coupons: {
              items: couponsItems,
              page,
              limit,
              total,
            },
            related_stores: related,
            faqs,
            testimonials,
            reviews_count: reviewsCount,
            avg_rating: avgRating,
            // trending_offers: trendingOffers,
            // recent_activity: recentActivity,
            trust_text: StoresRepo.getTrustText
              ? StoresRepo.getTrustText(store)
              : null,
            subscribe_info: {
              endpoint: "/api/subscribe",
              required_fields: ["email"],
            },
            verifier: store.verifier || null,
            verifier_id: store.verifier_id || null,
            aff_url: store.aff_url || null,
            web_url: store.web_url || null,
            proofs,
          },
          meta: {
            generated_at: new Date().toISOString(),
            canonical,
            jsonld,
            title: seo?.meta_title || undefined,
            description: seo?.meta_description || undefined,
          },
        };
      },
      { ttlSeconds: 60, keyExtra: cacheKey },
    );

    if (!result?.data) return notFound(res, "Store not found");
    return ok(res, result);
  } catch (e) {
    console.error("Store detail controller error:", e);
    return fail(res, "Failed to get store detail", e);
  }
}

function normalizeFaqsFromColumn(raw) {
  if (!raw) return [];

  let parsed = null;
  if (Array.isArray(raw)) {
    parsed = raw;
  } else if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.warn(
        "normalizeFaqsFromColumn: failed to JSON.parse faqs string:",
        err,
      );
      return [];
    }
  } else {
    console.warn(
      "normalizeFaqsFromColumn: unexpected faqs column type:",
      typeof raw,
    );
    return [];
  }

  if (!Array.isArray(parsed)) return [];

  const faqs = parsed
    .map((item) => {
      if (!item) return null;
      const q = (item.question || item.q || "").toString().trim();
      const a = (item.answer || item.a || item.ans || "").toString().trim();
      if (!q || !a) return null;
      return { question: q, answer: a };
    })
    .filter(Boolean)
    .slice(0, 50);

  return faqs;
}

/**
 * GET /public/v1/stores/:id/proofs
 */
export async function getMerchantProofs(req, res) {
  const merchantId = parseInt(req.params.id, 10);
  if (!merchantId)
    return res.status(400).json({ error: "Invalid merchant ID" });

  try {
    const proofs = await StoresRepo.fetchProofsByMerchantId(merchantId);
    return res.json(proofs);
  } catch (err) {
    console.error("Error fetching merchant proofs:", err);
    return res.status(500).json({ error: "Failed to fetch proofs" });
  }
}

/**
 * /public/v1/stores/:storeId/feedback
 */
export async function saveStoreFeedback(req, res) {
  try {
    const { storeId } = req.params;
    const { name, email, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({
        data: null,
        error: { message: "Name and message are required" },
      });
    }

    const feedback = await StoresRepo.insertStoreFeedback({
      storeId,
      name: name.trim(),
      email: email || null,
      message: message.trim(),
    });

    return res.status(201).json({
      data: feedback,
      error: null,
    });
  } catch (err) {
    console.error("Save feedback error:", err);

    return res.status(500).json({
      data: null,
      error: { message: "Error submitting feedback" },
    });
  }
}

/**
 * GET /public/v1/stats
 * Returns total active coupons and total active stores.
 * Cache TTL: 5 minutes — data changes slowly.
 */
export async function getStats(req, res) {
  try {
    const result = await withCache(
      req,
      async () => {
        const { supabase } = await import("../dbhelper/dbclient.js");

        const [couponsRes, storesRes] = await Promise.all([
          supabase
            .from("coupons")
            .select("id", { count: "exact", head: true })
            .eq("is_publish", true),
          supabase
            .from("merchants")
            .select("id", { count: "exact", head: true })
            .eq("is_publish", true),
        ]);

        if (couponsRes.error) throw couponsRes.error;
        if (storesRes.error) throw storesRes.error;

        return {
          data: {
            total_coupons: couponsRes.count ?? 0,
            total_stores: storesRes.count ?? 0,
          },
          meta: { generated_at: new Date().toISOString() },
        };
      },
      { ttlSeconds: 300, keyExtra: "site-stats" },
    );

    return ok(res, result);
  } catch (e) {
    console.error("getStats error:", e);
    return fail(res, "Failed to fetch stats", e);
  }
}
