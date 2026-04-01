const SUPABASE_BASE =
  "https://ldyyraumuunwimvyutnx.supabase.co/storage/v1/object/public";

export function cdnUrl(src) {
  if (typeof src === "string" && src.startsWith(SUPABASE_BASE)) {
    return src.replace(SUPABASE_BASE, "/cdn");
  }
  return src;
}
