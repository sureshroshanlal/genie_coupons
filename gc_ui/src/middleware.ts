import { defineMiddleware } from "astro:middleware";

const EXCLUDED = new Set(["www", "api", "admin", "admin-api"]);
const MAIN_DOMAIN = "geniecoupon.com";

// Stale/duplicate store subdomains -> canonical slug
const SLUG_REDIRECTS: Record<string, string> = {
  "healthvape-1-1": "healthvape",
  "healthvape-1": "healthvape",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  const isSubdomain = parts.length >= 3 && !EXCLUDED.has(parts[0]);

  if (isSubdomain) {
    const storeSlug = parts[0];
    const url = new URL(context.request.url);

    const canonicalSlug = SLUG_REDIRECTS[storeSlug];
    if (canonicalSlug) {
      return context.redirect(
        `https://${canonicalSlug}.${MAIN_DOMAIN}${url.pathname}${url.search}`,
        301,
      );
    }

    const isRoot = url.pathname === "/" || url.pathname === "";
    if (!isRoot) {
      return context.redirect(
        `https://${MAIN_DOMAIN}${url.pathname}${url.search}`,
        301,
      );
    }

    context.locals.storeSlug = storeSlug;
    context.locals.isSubdomain = true;
  } else {
    context.locals.isSubdomain = false;
    context.locals.storeSlug = null;
  }

  return next();
});
