export function storeContext(req, res, next) {
  // 1️⃣ Header wins (Astro / API-driven)
  if (req.headers["x-store-slug"]) {
    req.storeSlug = req.headers["x-store-slug"];
    return next();
  }

  // 2️⃣ Fallback: subdomain
  const host = req.headers.host || "";
  const parts = host.split(".");

  if (parts.length >= 3 && parts[1] === "geniecoupons") {
    req.storeSlug = parts[0];
  }

  next();
}
