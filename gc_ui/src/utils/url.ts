const MAIN_DOMAIN = "https://geniecoupon.com";
const STORE_DOMAIN = "geniecoupon.com";

export function storeUrl(slug: string): string {
  return `https://${slug}.${STORE_DOMAIN}`;
}

export function mainUrl(path: string): string {
  return `${MAIN_DOMAIN}${path}`;
}
