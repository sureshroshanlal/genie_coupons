// dbhelper/blogsRepoPublic.js
import { supabase } from "../dbhelper/dbclient.js";
import { sanitize } from "../utils/sanitize.js";

/**
 * list(params)
 * params: { q, categoryId, sort, page, limit, skipCount = false, mode = "default" }
 * - mode === "homepage" => lightweight select (no counts).
 * returns: { rows, total }
 */
export async function list({
  q,
  categoryId,
  sort,
  page,
  limit,
  skipCount = false,
  mode = "default",
}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // HOMEPAGE mode: lightweight and fast (no counts, minimal fields)
  if (mode === "homepage") {
    let qBuilder = supabase
      .from("blogs")
      .select(
        `
        id,
        slug,
        title,
        featured_image_url,
        featured_thumb_url,
        created_at,
        updated_at,
        is_featured,
        category_id,
        blog_categories(name)
      `
      )
      .eq("is_publish", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q) qBuilder = qBuilder.ilike("title", `%${q}%`);
    if (categoryId) qBuilder = qBuilder.eq("category_id", categoryId);

    const { data, error } = await qBuilder;
    if (error) throw error;

    const rows = (data || []).map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      hero_image_url: b.featured_image_url || b.featured_thumb_url || null,
      category: b.blog_categories?.name || null, // ✅ plain string from blog_categories
      created_at: b.created_at,
      updated_at: b.updated_at,
      is_featured: !!b.is_featured,
    }));

    return { rows, total: rows.length };
  }

  // DEFAULT mode: full listing (count optional)
  let total = null;
  if (!skipCount) {
    let cQuery = supabase
      .from("blogs")
      .select("id", { count: "exact", head: true })
      .eq("is_publish", true);

    if (q) cQuery = cQuery.ilike("title", `%${q}%`);
    if (categoryId) cQuery = cQuery.eq("category_id", categoryId);

    const { count, error: cErr } = await cQuery;
    if (cErr) throw cErr;
    total = count || 0;
  }

  let query = supabase
    .from("blogs")
    .select(
      `
      id,
      slug,
      title,
      featured_image_url,
      featured_thumb_url,
      created_at,
      updated_at,
      is_featured,
      category_id,
      blog_categories(name)
    `
    )
    .eq("is_publish", true)
    .range(from, to);

  if (q) query = query.ilike("title", `%${q}%`);
  if (categoryId) query = query.eq("category_id", categoryId);

  if (sort === "featured") {
    query = query
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data || []).map((b) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    hero_image_url: b.featured_image_url || b.featured_thumb_url || null,
    category: b.blog_categories?.name || null, // ✅ plain string
    created_at: b.created_at,
    updated_at: b.updated_at,
    is_featured: !!b.is_featured,
  }));

  return { rows, total: total || rows.length };
}

// blogsRepo.getBySlug
export async function getBySlug(slug) {
  if (!slug) return null;

  try {
    const { data, error } = await supabase
      .from("blogs")
      .select(
        `
        id,
        slug,
        title,
        featured_image_url,
        featured_thumb_url,
        created_at,
        updated_at,
        meta_title,
        meta_description,
        content,
        category_id,
        blog_categories(name),
        author_id,
        authors ( id, name, avatar_url, bio_html, same_as )
      `
      )
      .eq("slug", slug)
      .eq("is_publish", true)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("getBySlug supabase error:", error);
      return null;
    }
    if (!data) return null;

    const authorRow = data.authors || null;

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      hero_image_url:
      data.featured_image_url || data.featured_thumb_url || null,
      created_at: data.created_at ? new Date(data.created_at).toISOString() : null,
      updated_at: data.updated_at ? new Date(data.updated_at).toISOString() : null,
      seo_title: data.meta_title || "",
      meta_description: data.meta_description || "",
      content_html: sanitize(data.content || ""),
      category: data.blog_categories?.name || null, // ✅ plain string
      category_id: data.category_id || null,
      author: authorRow
        ? {
            id: authorRow.id ?? data.author_id ?? null,
            name: authorRow.name ?? "Editorial Team",
            avatar_url: authorRow.avatar_url ?? null,
            bio: authorRow.bio_html ? sanitize(authorRow.bio_html) : null,
            sameAs: Array.isArray(authorRow.same_as) ? authorRow.same_as : [],
          }
        : null,
    };
  } catch (e) {
    console.error("getBySlug exception for slug=%s: %o", slug, e);
    return null;
  }
}

/**
 * Build SEO metadata
 */
export function buildSeo(blog, { canonical, locale } = {}) {
  return {
    seo_title: blog.seo_title || blog.title,
    meta_description:
      blog.meta_description || `Blog Article for ${blog.title}.`,
    canonical: canonical,
    locale: locale || "en",
    hreflang: [locale || "en"],
  };
}

export function buildBreadcrumbs(blog, { origin }) {
  const SITE_ORIGIN = origin || "";

  const safeName = blog && blog.title ? String(blog.title) : "Blog";
  const safeSlug =
    blog && blog.slug ? encodeURIComponent(String(blog.slug)) : "";

  const homeUrl = SITE_ORIGIN ? `${SITE_ORIGIN}/` : "/";
  const blogsUrl = SITE_ORIGIN ? `${SITE_ORIGIN}/blogs` : "/blogs";
  const blogUrl = SITE_ORIGIN
    ? `${SITE_ORIGIN}/blogs/${safeSlug}`
    : `/blogs/${safeSlug}`;

  return [
    { name: "Home", url: homeUrl },
    { name: "Blogs", url: blogsUrl },
    { name: safeName, url: blogUrl },
  ];
}

export async function related(blog, limit = 6) {
  if (!blog?.category_id) return [];

  const { data, error } = await supabase
    .from("blogs")
    .select(
      `
      id,
      slug,
      title,
      featured_image_url,
      featured_thumb_url,
      created_at
    `
    )
    .eq("is_publish", true)
    .neq("id", blog.id)
    .eq("category_id", blog.category_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    hero_image_url: r.featured_image_url || r.featured_thumb_url || null,
    created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
  }));
}

export async function listSlugs() {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug, updated_at")
    .eq("is_publish", true);

  if (error) throw error;
  return { slugs: data || [] };
}
