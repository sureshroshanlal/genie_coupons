// controllers/publicCoupons.js
import * as CouponsRepo from "../dbhelper/CouponsRepoPublic.js";
import { supabase } from "../dbhelper/dbclient.js";
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

/**
 * Fetches approved reviews for a list of coupon IDs in a single query.
 * Returns a map: { [couponId]: { reviews: [], aggregate: { avg_rating, total } } }
 */
async function fetchReviewsForCoupons(couponIds) {
  if (!couponIds?.length) return {};

  const { data: reviewRows, error } = await supabase
    .from("coupon_reviews")
    .select(
      "id, coupon_id, rating, comment, screenshot_url, created_at, user_id",
    )
    .in("coupon_id", couponIds)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (error || !reviewRows?.length) return {};

  // Fetch profiles for all unique user_ids
  const userIds = [...new Set(reviewRows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

  // Group by coupon_id
  const grouped = {};
  for (const r of reviewRows) {
    if (!grouped[r.coupon_id]) grouped[r.coupon_id] = [];
    grouped[r.coupon_id].push({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      screenshot_url: r.screenshot_url,
      created_at: r.created_at,
      user: {
        full_name: profileMap[r.user_id]?.full_name || "Anonymous",
        avatar_url: profileMap[r.user_id]?.avatar_url || null,
      },
    });
  }

  // Build result map with aggregate
  const result = {};
  for (const [couponId, reviews] of Object.entries(grouped)) {
    const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    result[couponId] = {
      reviews,
      aggregate: {
        avg_rating: Math.round(avg * 10) / 10,
        total: reviews.length,
      },
    };
  }

  return result;
}

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

        // Fetch reviews for all coupons in one query
        const couponIds = safeRows.map((c) => c.id);
        const reviewsMap = await fetchReviewsForCoupons(couponIds);

        // Attach reviews to each coupon
        const rowsWithReviews = safeRows.map((c) => ({
          ...c,
          reviews: reviewsMap[c.id]?.reviews || [],
          review_aggregate: reviewsMap[c.id]?.aggregate || {
            avg_rating: 0,
            total: 0,
          },
        }));

        const offers = rowsWithReviews.map((i) => buildOfferJsonLd(i, origin));

        const nextUrl = meta?.next_cursor
          ? `/coupons?cursor=${encodeURIComponent(meta.next_cursor)}&limit=${meta.limit || limit}&type=${type}&status=${status}&sort=${sort}&locale=${locale}`
          : null;

        return {
          data: rowsWithReviews,
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
