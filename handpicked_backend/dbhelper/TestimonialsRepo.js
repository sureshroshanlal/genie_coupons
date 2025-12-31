// src/dbhelper/TestimonialsRepo.js
import { supabase } from "./dbclient.js";

/**
 * TestimonialsRepo.getTopForStore({ merchantId, limit = 3 })
 *
 * Returns:
 * {
 *   items: [ { id, user_name, rating, comment, avatar_url, posted_at } ],
 *   avgRating: number | null,
 *   totalReviews: number
 * }
 *
 * Notes:
 * - Expects a "reviews" or "testimonials" table with fields:
 *   id, merchant_id, user_name, rating (numeric), comment (text), avatar_url, created_at
 * - Adjust field names if your schema uses different names.
 */
export async function getTopForStore({ merchantId, limit = 3 }) {
  if (!merchantId) {
    return { items: [], avgRating: null, totalReviews: 0 };
  }

  try {
    // 1) Fetch top reviews (by rating desc, then recent)
    const { data: itemsData, error: itemsErr } = await supabase
      .from("reviews")
      .select("id, user_name, rating, comment, avatar_url, created_at")
      .eq("merchant_id", merchantId)
      .order("rating", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (itemsErr) {
      console.warn(
        "TestimonialsRepo.getTopForStore: error fetching items",
        itemsErr
      );
    }

    const items = (itemsData || []).map((r) => ({
      id: r.id,
      user_name: r.user_name || "Anonymous",
      rating: typeof r.rating === "number" ? r.rating : Number(r.rating) || 0,
      comment: r.comment || "",
      avatar_url: r.avatar_url || null,
      posted_at: r.created_at || null,
    }));

    // 2) Fetch total count of reviews (head=true)
    const { count: totalCount, error: countErr } = await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId);

    if (countErr) {
      console.warn("TestimonialsRepo.getTopForStore: count error", countErr);
    }
    const totalReviews = totalCount || 0;

    // 3) Fetch average rating via PostgREST aggregate alias: avg_rating:avg(rating)
    // This returns an array/object like [{ avg_rating: 4.5 }] or maybe single object depending on supabase client.
    const { data: avgData, error: avgErr } = await supabase
      .from("reviews")
      .select("avg_rating:avg(rating)")
      .eq("merchant_id", merchantId)
      .maybeSingle();

    if (avgErr) {
      console.warn("TestimonialsRepo.getTopForStore: avg error", avgErr);
    }

    let avgRating = null;
    if (avgData) {
      // avgData may be { avg_rating: "4.5" } or { avg_rating: 4.5 }
      const v = avgData.avg_rating;
      if (v !== null && v !== undefined) {
        avgRating = Number(v);
      }
    }

    return {
      items,
      avgRating,
      totalReviews,
    };
  } catch (e) {
    console.error("TestimonialsRepo.getTopForStore exception:", e);
    return { items: [], avgRating: null, totalReviews: 0 };
  }
}

export default {
  getTopForStore,
};
