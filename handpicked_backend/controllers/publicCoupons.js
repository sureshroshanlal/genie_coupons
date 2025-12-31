// controllers/publicCoupons.js
import * as CouponsRepo from "../dbhelper/CouponsRepoPublic.js";
import { ok, fail } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import { buildCanonical } from "../utils/seo.js";
import {
  valPage,
  valLimit,
  valEnum,
  valLocale,
  deriveLocale,
} from "../utils/validation.js";
import { buildOfferJsonLd } from "../utils/jsonld.js";
import {
  COUPON_SORTS,
  COUPON_STATUS,
  COUPON_TYPES,
} from "../constants/publicEnums.js";
import { getOrigin, getPath } from "../utils/request-helper.js";
import { buildPrevNext } from "../utils/pagination.js";
import { makeListCacheKey } from "../utils/cacheKey.js";

/**
 * publicCoupons.list(req, res)
 * - Supports cursor-based navigation via ?cursor=..., limit=...
 * - Falls back to page/limit for SSR compatibility
 * - Returns meta.next/meta.prev as absolute backend API URLs (PUBLIC_API_BASE_URL)
 */
export async function list(req, res) {
  try {
    // Read page/limit/cursor robustly
    const page = valPage(req.query.page);
    const limit = valLimit(req.query.limit);
    const cursor =
      req.query && req.query.cursor ? String(req.query.cursor) : null;

    const type = valEnum(req.query.type, COUPON_TYPES, "all");
    const status = valEnum(req.query.status, COUPON_STATUS, "active");
    const sort = valEnum(req.query.sort, COUPON_SORTS, "latest");
    const locale = valLocale(req.query.locale) || deriveLocale(req);
    const qRaw = String(req.query.q || "");
    const q = qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw;
    const categorySlug = String(req.query.category || "").slice(0, 100);
    const storeSlug = String(req.query.store || "").slice(0, 100);

    // Resolve origin/path safely (getOrigin/getPath might be sync or async)
    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const params = {
      q: q.trim(),
      categorySlug: categorySlug.trim(),
      storeSlug: storeSlug.trim(),
      type,
      status,
      sort,
      locale,
      page,
      limit,
      cursor, // new: pass cursor through
      origin,
      path,
    };

    // Build deterministic cache key (controller-provided keyExtra)
    const cacheKey = makeListCacheKey("coupons", {
      page,
      limit,
      q: params.q || "",
      category: params.categorySlug || "",
      sort: params.sort || "",
      locale: params.locale || "",
      type: params.type || "",
      // Note: we intentionally do NOT include cursor in the cache key here,
      // because cursor implies forward-only next pages; include if you want per-cursor caching.
    });

    // TTL: default 60s; when deploying/testing you may set to 0 temporarily and revert
    const ttlSeconds = Number(process.env.CACHE_TTL_PUBLIC || 60);

    const result = await withCache(
      req,
      async () => {
        try {
          // CouponsRepo.list returns: { data, meta }
          const { data, meta } = await CouponsRepo.list(params);

          const safeRows = Array.isArray(data) ? data : [];

          // Build Offer JSON-LD for items with ends_at
          const offers = safeRows
            .filter((i) => !!i.ends_at)
            .map((i) => buildOfferJsonLd(i, params.origin));

          // Build nav using legacy page-based nav (for canonical/prev/next), using meta.total when available.
          const nav = buildPrevNext({
            origin: params.origin,
            path: params.path,
            page,
            limit,
            total: meta?.total || 0,
            extraParams: {
              q: params.q || undefined,
              category: params.categorySlug || undefined,
              store: params.storeSlug || undefined,
              type: params.type,
              status: params.status,
              sort: params.sort,
              locale: params.locale || undefined,
            },
          });

          // Build absolute API URLs for client use. Prefer cursor when available.
          const backendBase = (process.env.PUBLIC_API_BASE_URL || "")
            .toString()
            .trim()
            .replace(/\/+$/, ""); // e.g. https://handpickedclient.onrender.com/public/v1

          // meta may contain next_cursor/prev_cursor (cursor mode) or page/total (offset mode)
          let apiPrev = null;
          let apiNext = null;

          if (backendBase) {
            // Cursor-mode next/prev (if repo returned next_cursor)
            if (meta && meta.next_cursor) {
              apiNext = `${backendBase}/coupons?cursor=${encodeURIComponent(
                meta.next_cursor
              )}&limit=${meta.limit || limit}`;
            } else if (nav && nav.next) {
              // Fallback: use legacy nav but point at backend (so it returns HTML or JSON depending)
              try {
                const u = new URL(nav.next, "http://example.invalid");
                apiNext = `${backendBase}${u.pathname}${u.search}`;
              } catch (e) {
                apiNext = nav.next;
              }
            }

            if (meta && meta.prev_cursor) {
              apiPrev = `${backendBase}/coupons?cursor=${encodeURIComponent(
                meta.prev_cursor
              )}&limit=${meta.limit || limit}`;
            } else if (nav && nav.prev) {
              try {
                const u2 = new URL(nav.prev, "http://example.invalid");
                apiPrev = `${backendBase}${u2.pathname}${u2.search}`;
              } catch (e) {
                apiPrev = nav.prev;
              }
            }
          } else {
            // If no backendBase configured, fall back to nav URLs (relative or absolute)
            apiPrev = nav.prev;
            apiNext = nav.next;
          }

          // Before returning (and before caching), ensure nav values used in meta point to backend API urls
          nav.prev = apiPrev || null;
          nav.next = apiNext || null;

          // Return payload (this object will be cached by withCache, so must contain backend URLs)
          return {
            data: safeRows,
            meta: {
              ...meta,
              canonical: buildCanonical({ ...params }),
              prev: nav.prev,
              next: nav.next,
              total_pages: nav.totalPages,
              jsonld: { offers },
            },
          };
        } catch (err) {
          console.error("Failed to fetch coupons:", err);
          return {
            data: [],
            meta: {
              page,
              limit,
              total: 0,
              canonical: buildCanonical({ ...params }),
              prev: null,
              next: null,
              total_pages: 1,
              jsonld: { offers: [] },
            },
          };
        }
      },
      { ttlSeconds, keyExtra: cacheKey }
    );

    // Prevent Vercel CDN from caching HTML incorrectly; keep restrictive headers on API responses.
    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );

    return ok(res, result);
  } catch (e) {
    console.error("Error in coupons.list:", e);
    return fail(res, "Failed to list coupons", e);
  }
}
