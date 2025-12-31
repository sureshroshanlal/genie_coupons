// src/dbhelper/ActivityRepo.js
import { supabase } from "./dbclient.js";

/**
 * ActivityRepo.recentOffersForStore({ merchantId, days = 30, limit = 10 })
 */
export async function recentOffersForStore({
  merchantId,
  days = 30,
  limit = 10,
} = {}) {
  if (!supabase) {
    console.error("recentOffersForStore: supabase client missing");
    return { total_offers_added_last_30d: 0, recent: [] };
  }
  if (!merchantId) return { total_offers_added_last_30d: 0, recent: [] };

  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    // --- COUNT query (created_at only)
    const { count, error: cErr } = await supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .eq("is_publish", true)
      .gte("created_at", cutoff);

    if (cErr) {
      console.error("ActivityRepo.recentOffersForStore: count error", cErr);
    }
    const total = typeof count === "number" ? count : 0;

    // --- FETCH recent items (created_at only)
    const { data: rows, error: rErr } = await supabase
      .from("coupons")
      .select("id, coupon_type, title, description, created_at")
      .eq("merchant_id", merchantId)
      .eq("is_publish", true)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (rErr) {
      console.error(
        "ActivityRepo.recentOffersForStore: fetch recent error",
        rErr
      );
      return { total_offers_added_last_30d: total, recent: [] };
    }

    const recent = (rows || []).map((r) => ({
      id: r.id,
      title: r.title,
      type: r.coupon_type,
      short_desc: r.description || null,
      published_at: r.created_at || null,
    }));

    return { total_offers_added_last_30d: total, recent };
  } catch (e) {
    console.error("ActivityRepo.recentOffersForStore exception:", e);
    return { total_offers_added_last_30d: 0, recent: [] };
  }
}

export default {
  recentOffersForStore,
};
