const SUPABASE_BASE =
  "https://ldyyraumuunwimvyutnx.supabase.co/storage/v1/object/public";
const SUPABASE_TRANSFORM =
  "https://ldyyraumuunwimvyutnx.supabase.co/storage/v1/render/image/public";

export function cdnUrl(src) {
  if (typeof src === "string" && src.startsWith(SUPABASE_BASE)) {
    return src.replace(SUPABASE_BASE, "/cdn");
  }
  return src ?? "";
}

/**
 * Returns a srcset string using Supabase image transform API
 * widths: array of pixel widths to generate
 */
export function cdnSrcset(src, widths = [516, 800, 1200]) {
  if (!src || !src.startsWith(SUPABASE_BASE)) return "";
  const path = src.replace(SUPABASE_BASE + "/", "");
  return widths
    .map((w) => `/cdn-transform/${path}?width=${w}&quality=75 ${w}w`)
    .join(", ");
}

export function cdnThumb(src, width = 96, quality = 80) {
  if (!src || !src.startsWith(SUPABASE_BASE)) return cdnUrl(src);
  const path = src.replace(SUPABASE_BASE + "/", "");
  return `/cdn-transform/${path}?width=${width}&quality=${quality}&resize=contain`;
}
