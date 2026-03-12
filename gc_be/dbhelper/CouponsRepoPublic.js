// dbhelper/CouponsRepoPublic.js
import { supabase } from "../dbhelper/dbclient.js";

const COUPON_SELECT = `id, coupon_type, title, description, coupon_code, show_proof, is_editor, click_count, ends_at, aff_url, image_url, discount_type, discount_value, merchant_id, merchants:merchant_id ( slug, name, logo_url )`;

const encodeCursor = (row) => {
  if (!row) return null;
  try {
    return Buffer.from(JSON.stringify({ id: row.id })).toString("base64");
  } catch {
    return null;
  }
};

const decodeCursor = (c) => {
  if (!c || c === "") return null;
  try {
    return JSON.parse(Buffer.from(String(c), "base64").toString());
  } catch {
    return null;
  }
};

const mapRow = (r) => ({
  id: r.id,
  title: r.title,
  code: r.coupon_type === "coupon" ? r.coupon_code || null : null,
  merchant_id: r.merchant_id || null,
  coupon_type: r.coupon_type,
  description: r.description || null,
  show_proof: !!r.show_proof,
  is_editor: !!r.is_editor,
  click_count: r.click_count || 0,
  ends_at: r.ends_at || null,
  aff_url: r.aff_url || null,
  image_url: r.image_url || null,
  discount_type: r.discount_type || null,
  discount_value: r.discount_value || null,
  merchant: r.merchants
    ? {
        slug: r.merchants.slug,
        name: r.merchants.name,
        logo_url: r.merchants.logo_url,
      }
    : null,
  merchant_name: r.merchants?.name || null,
});

/**
 * CouponsRepo.list(params)
 * Cursor-based pagination only.
 * Returns: { data: [...], meta: { limit, next_cursor, has_more } }
 */
export async function list({
  q,
  categorySlug,
  storeSlug,
  type,
  sort,
  limit = 20,
  cursor = null,
  mode = "default",
} = {}) {
  const _limit = Math.min(Math.max(Number(limit) || 20, 1), 100);

  let categoryName = null;
  if (categorySlug) {
    const { data: cat, error: ce } = await supabase
      .from("merchant_categories")
      .select("name")
      .eq("slug", categorySlug)
      .maybeSingle();
    if (ce) throw ce;
    categoryName = cat?.name || null;
  }

  let merchantId = null;
  if (storeSlug) {
    const { data: store, error: se } = await supabase
      .from("merchants")
      .select("id")
      .eq("slug", storeSlug)
      .maybeSingle();
    if (se) throw se;
    merchantId = store?.id || null;
  }

  let categoryMerchantIds = null;
  if (categoryName) {
    const { data: mids, error: mErr } = await supabase
      .from("merchants")
      .select("id")
      .contains("category_names", [categoryName]);
    if (!mErr && Array.isArray(mids) && mids.length) {
      categoryMerchantIds = mids.map((m) => m.id);
    }
  }

  const decoded = decodeCursor(cursor);

  let qBuilder = supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .eq("is_publish", true)
    .order("id", { ascending: false })
    .limit(_limit + 1);

  if (decoded?.id) qBuilder = qBuilder.lt("id", decoded.id);
  if (q) qBuilder = qBuilder.ilike("title", `%${q}%`);
  if (merchantId) qBuilder = qBuilder.eq("merchant_id", merchantId);
  if (type && type !== "all") qBuilder = qBuilder.eq("coupon_type", type);
  if (categoryMerchantIds)
    qBuilder = qBuilder.in("merchant_id", categoryMerchantIds);
  if (mode === "homepage") qBuilder = qBuilder.eq("home", true);

  const { data, error } = await qBuilder;
  if (error) throw error;

  const hasMore = data.length > _limit;
  const pageRows = data.slice(0, _limit);
  const rows = pageRows.map(mapRow);
  const nextCursor = hasMore
    ? encodeCursor(pageRows[pageRows.length - 1])
    : null;

  return {
    data: rows,
    meta: { limit: _limit, next_cursor: nextCursor, has_more: hasMore },
  };
}

export async function listForStore({ merchantId, type, page, limit, sort }) {
  const _limit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const from = (page - 1) * _limit;
  const to = from + _limit - 1;

  let query = supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .eq("merchant_id", merchantId)
    .eq("is_publish", true)
    .range(from, to);

  if (type !== "all") query = query.eq("coupon_type", type);
  query =
    sort === "editor"
      ? query
          .order("is_editor", { ascending: false })
          .order("id", { ascending: false })
      : query.order("id", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let cQuery = supabase
    .from("coupons")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchantId)
    .eq("is_publish", true);
  if (type !== "all") cQuery = cQuery.eq("coupon_type", type);
  const { count, error: cErr } = await cQuery;
  if (cErr) throw cErr;

  return { items: (data || []).map(mapRow), total: count || 0 };
}

export async function getById(offerId) {
  if (!offerId) return null;

  const { data, error } = await supabase
    .from("coupons")
    .select(
      `id, coupon_type, title, description, coupon_code, click_count, discount_type, discount_value, merchant_id, merchants:merchant_id ( id, slug, name, logo_url, aff_url, web_url )`,
    )
    .eq("id", offerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    code: data.coupon_type === "coupon" ? data.coupon_code || null : null,
    type: data.coupon_type,
    description: data.description,
    click_count: data.click_count || 0,
    discount_type: data.discount_type || null,
    discount_value: data.discount_value || null,
    merchant_id: data.merchant_id,
    merchant: data.merchants
      ? {
          id: data.merchants.id,
          slug: data.merchants.slug,
          name: data.merchants.name,
          aff_url: data.merchants.aff_url,
          web_url: data.merchants.web_url,
          logo_url: data.merchants.logo_url,
        }
      : null,
  };
}

export async function incrementClickCount(offerId) {
  if (!offerId) throw new Error("offerId required");

  const { data, error } = await supabase.rpc("increment_coupon_click_count", {
    p_id: Number(offerId),
  });
  if (error) throw error;

  if (
    Array.isArray(data) &&
    data.length > 0 &&
    data[0].click_count !== undefined
  ) {
    return Number(data[0].click_count);
  }
  return Number(Array.isArray(data) ? data[0] : data);
}

export async function listTopByClicks(merchantId, limit = 3) {
  if (!merchantId) return [];

  const { data, error } = await supabase
    .from("coupons")
    .select(`id, coupon_type, title, description, click_count, merchant_id`)
    .eq("merchant_id", merchantId)
    .eq("is_publish", true)
    .order("click_count", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("listTopByClicks error:", error);
    return [];
  }

  return (data || []).map((r) => ({
    id: r.id,
    title: r.title,
    coupon_type: r.coupon_type,
    short_desc: r.description,
    click_count: r.click_count || 0,
    merchant_id: r.merchant_id,
    code: null,
  }));
}

export async function countRecentForStore({
  merchantId,
  days = 30,
  limit = 10,
}) {
  if (!merchantId) return { total_offers_added_last_30d: 0, recent: [] };

  const cutoff = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { count, error: cErr } = await supabase
      .from("coupons")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .eq("is_publish", true)
      .gte("created_at", cutoff);

    if (cErr) console.warn("countRecentForStore count error:", cErr);

    const { data: recentRows, error: rErr } = await supabase
      .from("coupons")
      .select("id, coupon_type, title, description, created_at")
      .eq("merchant_id", merchantId)
      .eq("is_publish", true)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (rErr) return { total_offers_added_last_30d: count || 0, recent: [] };

    return {
      total_offers_added_last_30d: count || 0,
      recent: (recentRows || []).map((r) => ({
        id: r.id,
        title: r.title,
        type: r.coupon_type,
        short_desc: r.description,
        published_at: r.created_at || null,
      })),
    };
  } catch (e) {
    console.error("countRecentForStore exception:", e);
    return { total_offers_added_last_30d: 0, recent: [] };
  }
}
