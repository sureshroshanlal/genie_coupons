import { defineMiddleware } from "astro:middleware";
import activeStoresRaw from "./_data/stores.json";

const MAIN_DOMAIN = "geniecoupon.com";
const EXCLUDED = new Set(["www", "api", "admin", "admin-api", "localhost"]);

// Known legacy/duplicate store subdomains -> canonical slug
const SLUG_REDIRECTS: Record<string, string> = {
  "healthvape-1-1": "healthvape",
  "healthvape-1": "healthvape",
};

const activeStores = activeStoresRaw as Record<string, boolean>;

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const parts = hostname.split(".");
  const isSubdomain = parts.length >= 3 && !EXCLUDED.has(parts[0]);

  if (isSubdomain) {
    const rawSubdomain = parts[0];
    const canonicalSlug = SLUG_REDIRECTS[rawSubdomain] || rawSubdomain;
    const url = new URL(context.request.url);
    const search = url.search || "";

    // 1. Instant check from compiled active stores map (0ms latency, 100% reliable)
    if (activeStores[canonicalSlug]) {
      return context.redirect(
        `https://${MAIN_DOMAIN}/stores/${canonicalSlug}${search}`,
        301,
      );
    }

    // 2. Fallback check against Public API for newly added stores not yet in static map
    try {
      const apiBase =
        process.env.PUBLIC_API_BASE_URL || "https://api.geniecoupon.com/public/v1";
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${apiBase}/stores/${canonicalSlug}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        const json = (await res.json()) as any;
        if (json?.data) {
          return context.redirect(
            `https://${MAIN_DOMAIN}/stores/${canonicalSlug}${search}`,
            301,
          );
        }
      }
    } catch (e) {
      console.warn("Middleware fallback lookup error:", e);
    }

    // 3. 410 Gone for untracked / spam wildcard subdomains (signals Googlebot to purge immediately)
    return new Response("410 Gone - Resource permanently removed", {
      status: 410,
      statusText: "Gone",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  }

  context.locals.isSubdomain = false;
  context.locals.storeSlug = null;
  return next();
});
