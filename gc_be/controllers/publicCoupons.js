// controllers/publicCoupons.js
import * as CouponsRepo from "../dbhelper/CouponsRepoPublic.js";
import { ok, fail } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import {
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
import { makeListCacheKey } from "../utils/cacheKey.js";

export async function list(req, res) {
  try {
    const limit = valLimit(req.query.limit);
    const cursor = req.query.cursor ? String(req.query.cursor) : null;
    const type = valEnum(req.query.type, COUPON_TYPES, "all");
    const status = valEnum(req.query.status, COUPON_STATUS, "active");
    const sort = valEnum(req.query.sort, COUPON_SORTS, "latest");
    const locale = valLocale(req.query.locale) || deriveLocale(req);
    const qRaw = String(req.query.q || "");
    const q = qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw;
    const categorySlug = String(req.query.category || "")
      .slice(0, 100)
      .trim();
    const storeSlug = String(req.query.store || "")
      .slice(0, 100)
      .trim();
    const mode = req.query.mode || "default";

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const params = {
      q: q.trim(),
      categorySlug,
      storeSlug,
      type,
      status,
      sort,
      locale,
      limit,
      cursor,
      origin,
      path,
      mode,
    };

    const cacheKey = makeListCacheKey("coupons", {
      cursor: cursor || "",
      limit,
      q: params.q || "",
      category: categorySlug || "",
      sort,
      locale: locale || "",
      type,
      mode,
    });

    const result = await withCache(
      req,
      async () => {
        const { data, meta } = await CouponsRepo.list(params);
        const safeRows = Array.isArray(data) ? data : [];
        const offers = safeRows.map((i) => buildOfferJsonLd(i, origin));

        const nextUrl = meta?.next_cursor
          ? `/coupons?cursor=${encodeURIComponent(meta.next_cursor)}&limit=${meta.limit || limit}&type=${type}&status=${status}&sort=${sort}&locale=${locale}`
          : null;

        return {
          data: safeRows,
          meta: {
            limit: meta.limit,
            has_more: meta.has_more || false,
            next_cursor: meta.next_cursor || null,
            next: nextUrl,
            jsonld: { offers },
          },
        };
      },
      { ttlSeconds: 0, keyExtra: cacheKey },
    );

    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
    );
    return ok(res, result);
  } catch (e) {
    console.error("Error in coupons.list:", e);
    return fail(res, "Failed to list coupons", e);
  }
}
