// dbhelper/AuthorsRepo.js
import { supabase } from "../dbhelper/dbclient.js";

/**
 * Fetch author by slug
 */
export async function getAuthorBySlug(slug) {
  if (!slug) return null;

  try {
    const { data, error } = await supabase
      .from("authors")
      .select(
        `
        id,
        slug,
        name,
        designation,
        bio_html,
        avatar_url,
        verifying_since,
        same_as,
        created_at
      `,
      )
      .eq("slug", String(slug).trim())
      .maybeSingle();

    if (error) {
      console.error("AuthorsRepo.getAuthorBySlug error:", error);
      return null;
    }
    if (!data) return null;

    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      designation: data.designation || "",
      bioHtml: data.bio_html || "",
      avatar_url: data.avatar_url || null,
      verifying_since: data.verifying_since || null,
      same_as: Array.isArray(data.same_as) ? data.same_as : [],
      created_at: data.created_at,
    };
  } catch (e) {
    console.error("AuthorsRepo.getAuthorBySlug unexpected error:", e);
    return null;
  }
}

/**
 * Fetch all stores verified by this author (for their profile page)
 */
export async function getStoresByAuthor(authorId, { limit = 50 } = {}) {
  if (!authorId) return [];

  try {
    const { data, error } = await supabase
      .from("merchants")
      .select("id, slug, name, logo_url, active_coupons_count")
      .eq("verifier_id", authorId)
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("AuthorsRepo.getStoresByAuthor error:", error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      logo_url: r.logo_url,
      active_coupons: r.active_coupons_count || 0,
    }));
  } catch (e) {
    console.error("AuthorsRepo.getStoresByAuthor unexpected error:", e);
    return [];
  }
}

/**
 * Fetch all stores verified by this author (for their profile page)
 */
export async function countStoresVerifiedByAuthor(authorId) {
  if (!authorId) return [];

  try {
    const { count, error } = await supabase
      .from("merchants")
      .select("*", { count: "exact", head: true })
      .eq("verifier_id", authorId);

    if (error) {
      console.error("AuthorsRepo.getStoresVerifiedByAuthorCount error:", error);
      return 0;
    }

    return count || 0;
  } catch (e) {
    console.error("AuthorsRepo.getStoresVerifiedByAuthorCount unexpected error:", e);
    return 0;
  }
}
 
/**
 * List all authors (for listing page)
 */
export async function listAuthors({ limit = 100 } = {}) {
  try {
    const { data, error } = await supabase
      .from("authors")
      .select(
        `
        id,
        slug,
        name,
        designation,
        avatar_url,
        verifying_since,
        same_as
      `,
      )
      .order("name", { ascending: true })
      .eq("is_content_author", true)
      .limit(limit);

    if (error) {
      console.error("AuthorsRepo.listAuthors error:", error);
      return [];
    }

    return (data || []).map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      designation: r.designation || "",
      avatar_url: r.avatar_url || null,
      verifying_since: r.verifying_since || null,
      same_as: Array.isArray(r.same_as) ? r.same_as : [],
    }));
  } catch (e) {
    console.error("AuthorsRepo.listAuthors unexpected error:", e);
    return [];
  }
}

/**
 * List all author slugs for static path generation
 */
export async function listAuthorSlugs() {
  try {
    const { data, error } = await supabase
      .from("authors")
      .select("slug, updated_at")
      .eq("is_content_author", true);

    if (error) {
      console.error("AuthorsRepo.listAuthorSlugs error:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("AuthorsRepo.listAuthorSlugs unexpected error:", e);
    return [];
  }
}
