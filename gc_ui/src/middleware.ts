import { defineMiddleware } from "astro:middleware";

const EXCLUDED = new Set(["www", "api", "admin", "admin-api"]);
const MAIN_DOMAIN = "geniecoupon.com";

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");
  const isSubdomain = parts.length >= 3 && !EXCLUDED.has(parts[0]);

  if (isSubdomain) {
    const storeSlug = parts[0];
    const url = new URL(context.request.url);
    const isRoot = url.pathname === "/" || url.pathname === "";
    const isInternalStorePage = url.pathname === "/store-page";

    if (!isRoot && !isInternalStorePage) {
      return context.redirect(
        `https://${MAIN_DOMAIN}${url.pathname}${url.search}`,
        301,
      );
    }

    context.locals.storeSlug = storeSlug;
    context.locals.isSubdomain = true;

    if (isRoot) {
      return context.rewrite("/store-page");
    }

    // Re-entry after rewrite — locals already set, just proceed
    return next();
  }

  context.locals.isSubdomain = false;
  context.locals.storeSlug = null;

  return next();
});