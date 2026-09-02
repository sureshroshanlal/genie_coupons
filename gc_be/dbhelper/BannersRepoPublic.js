// src/dbhelper/BannersRepoPublic.js
import { supabase } from "../dbhelper/dbclient.js";

const COLS = `
  id, store_id, image_url, click_url, alt_text, label,
  display_order, merchants:store_id (id, name, slug)
`;
// Supabase storage URLs and transformation logic
const SUPABASE_BASE =
  "https://ldyyraumuunwimvyutnx.supabase.co/storage/v1/object/public";
const PROXY_TRANSFORM = "https://www.geniecoupon.com/cdn-transform";
/**
 *
 * @param {*} imageUrl
 * @param {*} width
 * @param {*} quality
 * @returns
 */
function transformUrl(imageUrl, width, height, quality = 60) {
  if (!imageUrl?.startsWith(SUPABASE_BASE)) return imageUrl;
  const path = imageUrl.replace(SUPABASE_BASE + "/", "");
  const h = height || Math.round((width * 9) / 16);
  return `${PROXY_TRANSFORM}/${path}?width=${width}&height=${h}&resize=cover&quality=${quality}`;
}

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
      webp: [
        transformUrl(row.image_url, 360, 202), // mobile display
        transformUrl(row.image_url, 516, 290), // mobile retina / small tablet
        transformUrl(row.image_url, 800, 450), // tablet / desktop
        transformUrl(row.image_url, 1200, 675), // desktop retina
      ],
      fallback: transformUrl(row.image_url, 800, 450),
    },
    alt:
      row.alt_text ||
      (row.merchants?.name ? `${row.merchants.name} banner` : "Banner"),
  }));
}
