// src/dbhelper/BannersRepoPublic.js
import { supabase } from "../dbhelper/dbclient.js";

const COLS = `
  id, store_id, image_url, click_url, alt_text, label,
  display_order, merchants:store_id (id, name, slug)
`;

/**
 * List active banners ordered by display_order.
 * @param {{ limit?: number }} options
 */
export async function listActive({ limit = 20 } = {}) {
  const { data, error } = await supabase
    .from("merchant_banners")
    .select(COLS)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    store_id: row.store_id,
    store_name: row.merchants?.name || null,
    store_slug: row.merchants?.slug || null,
    image_url: row.image_url,
    click_url: row.click_url,
    alt_text: row.alt_text || "",
    label: row.label || null,
    display_order: row.display_order,
    // Shape expected by CoverflowCarousel
    variants: {
      webp: [row.image_url],
      avif: [],
      fallback: row.image_url,
    },
    alt:
      row.alt_text ||
      (row.merchants?.name ? `${row.merchants.name} banner` : "Banner"),
  }));
}
