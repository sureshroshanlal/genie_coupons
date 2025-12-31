// dbhelper/StoresRepoPublic.js
import { supabase } from "../dbhelper/dbclient.js";
import { sanitize } from "../utils/sanitize.js";

/**
 * list(params)
 * - params: { q, categorySlug, sort, page, limit, skipCount=false, mode="default" }
 * - returns: { rows: Array, total: number }
 */
export async function list({
  q = "",
  categorySlug = null,
  sort = "newest",
  page = 1,
  limit = 20,
  skipCount = false,
  mode = "default",
} = {}) {
  const safePage = Number(page) >= 1 ? Number(page) : 1;
  const safeLimit = Number(limit) >= 1 ? Number(limit) : 20;
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // Resolve category name if filter present
  let categoryName = null;
  if (categorySlug) {
    try {
      const { data: cat, error: ce } = await supabase
        .from("merchant_categories")
        .select("name")
        .eq("slug", String(categorySlug).trim())
        .maybeSingle();
      if (ce) throw ce;
      categoryName = cat?.name || null;
    } catch (err) {
      console.warn("Stores.list: category lookup failed", err);
      categoryName = null;
    }
  }

  // HOMEPAGE mode — lightweight select
  if (mode === "homepage") {
    try {
      let query = supabase
        .from("merchants")
        .select("id, slug, name, logo_url, active_coupons_count")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (q) query = query.ilike("name", `%${q}%`);
      if (categoryName)
        query = query.contains("category_names", [categoryName]);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data || []).map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        logo_url: r.logo_url,
        stats: { active_coupons: r.active_coupons_count || 0 },
      }));

      return { rows, total: rows.length };
    } catch (e) {
      console.error("Stores.list(homepage) error:", e);
      return { rows: [], total: 0 };
    }
  }

  // DEFAULT mode — full listing for /stores page
  try {
    // Count only if required
    let total = null;
    if (!skipCount) {
      try {
        let cQuery = supabase
          .from("merchants")
          .select("id", { count: "exact", head: true });
        if (q) cQuery = cQuery.ilike("name", `%${q}%`);
        if (categoryName)
          cQuery = cQuery.contains("category_names", [categoryName]);

        const { count, error: cErr } = await cQuery;
        if (cErr) throw cErr;
        total = count || 0;
      } catch (countErr) {
        console.warn("Stores.list: count query failed:", countErr);
        total = 0;
      }
    }

    // Main query
    let query = supabase
      .from("merchants")
      .select("id, slug, name, logo_url, created_at, active_coupons_count")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) query = query.ilike("name", `%${q}%`);
    if (categoryName) query = query.contains("category_names", [categoryName]);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      logo_url: r.logo_url,
      stats: { active_coupons: r.active_coupons_count || 0 },
    }));

    return { rows, total: total || rows.length };
  } catch (e) {
    console.error("Stores.list error:", e);
    return { rows: [], total: 0 };
  }
}

/**
 * Fetch store by slug
 */
export async function getBySlug(slug) {
  if (!slug) return null;

  const normSlug = String(slug || "").trim();

  try {
    const { data, error } = await supabase
      .from("merchants")
      .select(
        "id, slug, name, logo_url, category_names, side_description_html, description_html, meta_title, meta_description, faqs, h1keyword, meta_keywords, coupon_h2_blocks, coupon_h3_blocks, active_coupons_count"
      )
      .eq("slug", normSlug)
      .maybeSingle();

    if (error) {
      console.error("Supabase getBySlug error:", error);
      return null;
    }
    if (!data) return null;

    // Compute active coupons: use denormalized counter if present, else fallback to COUNT
    let activeCoupons = 0;
    if (typeof data.active_coupons_count === "number") {
      activeCoupons = data.active_coupons_count || 0;
    } else {
      try {
        const { count: ac, error: ce } = await supabase
          .from("coupons")
          .select("id", { count: "exact", head: true })
          .eq("merchant_id", data.id)
          .eq("is_publish", true);
        if (!ce) activeCoupons = ac || 0;
      } catch (countErr) {
        console.warn("getBySlug: coupon count fallback failed:", countErr);
        activeCoupons = 0;
      }
    }

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      logo_url: data.logo_url,
      category_names: Array.isArray(data.category_names)
        ? data.category_names
        : [],
      about_html: sanitize(data.side_description_html || ""),
      description_html: sanitize(data.description_html || ""),
      meta_title: data.meta_title || "",
      meta_description: data.meta_description || "",
      faqs: data.faqs || [],
      h1keyword: data.h1keyword,
      meta_keywords: data.meta_keywords,
      coupon_h2_blocks: Array.isArray(data.coupon_h2_blocks)
        ? data.coupon_h2_blocks
        : [],
      coupon_h3_blocks: Array.isArray(data.coupon_h3_blocks)
        ? data.coupon_h3_blocks
        : [],
      active_coupons: activeCoupons,
    };
  } catch (e) {
    console.error("getBySlug unexpected error:", e);
    return null;
  }
}

/**
 * Build SEO metadata
 */
export function buildSeo(store, { canonical, locale } = {}) {
  return {
    meta_title: store.meta_title || `${store.name} — Coupons & Deals`,
    meta_description:
      store.meta_description ||
      `Find verified coupons and deals for ${store.name}.`,
    canonical: canonical || "",
    locale: locale || "en",
    hreflang: [locale || "en"],
  };
}

/**
 * Build breadcrumbs
 */
export function buildBreadcrumbs(store, { origin } = {}) {
  const SITE_ORIGIN = origin || "";

  const safeName = store && store.name ? String(store.name) : "Store";
  const safeSlug =
    store && store.slug ? encodeURIComponent(String(store.slug)) : "";

  const homeUrl = SITE_ORIGIN ? `${SITE_ORIGIN}/` : "/";
  const storesUrl = SITE_ORIGIN ? `${SITE_ORIGIN}/stores` : "/stores";
  const storeUrl = SITE_ORIGIN
    ? `${SITE_ORIGIN}/stores/${safeSlug}`
    : `/stores/${safeSlug}`;

  return [
    { name: "Home", url: homeUrl },
    { name: "Stores", url: storesUrl },
    { name: safeName, url: storeUrl },
  ];
}

/**
 * Related stores by overlapping categories (RPC)
 */
export async function relatedByCategories({
  merchantId,
  categoryNames,
  limit = 8,
} = {}) {
  if (!categoryNames?.length) return [];

  try {
    const { data, error } = await supabase.rpc("merchants_by_category_any", {
      cat_list: categoryNames,
      exclude_id: merchantId || null,
      limit_val: limit || 8,
    });

    if (error) {
      console.error("Supabase relatedByCategories error:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Unexpected error in relatedByCategories:", e);
    return [];
  }
}

/**
 * Return lightweight slugs for sitemap
 */
export async function listSlugs() {
  try {
    const { data, error } = await supabase
      .from("merchants")
      .select("slug, updated_at")
      .eq("active", true);
    if (error) {
      console.error("Supabase listSlugs error:", error);
      return { slugs: [] };
    }
    return { slugs: data || [] };
  } catch (e) {
    console.error("Unexpected error in listSlugs:", e);
    return { slugs: [] };
  }
}
