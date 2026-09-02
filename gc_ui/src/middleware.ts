import { defineMiddleware } from "astro:middleware";

const MAIN_DOMAIN = "geniecoupon.com";
const EXCLUDED = new Set(["www", "api", "admin", "admin-api", "localhost"]);

// Known legacy/duplicate store subdomains -> canonical slug
const SLUG_REDIRECTS: Record<string, string> = {
  "healthvape-1-1": "healthvape",
  "healthvape-1": "healthvape",
};

interface StoreStatus {
  exists: boolean;
  hasActiveCoupons: boolean;
  canonicalSlug: string;
}

// In-memory cache of store statuses to protect database from Googlebot crawl spikes
let storeMap: Map<string, StoreStatus> | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getStoreMap(): Promise<Map<string, StoreStatus>> {
  const now = Date.now();
  if (storeMap && now - lastFetchTime < CACHE_TTL_MS) {
    return storeMap;
  }

  try {
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      (import.meta.env ? import.meta.env.SUPABASE_URL : null);
    const supabaseKey =
      process.env.SUPABASE_KEY ||
      (import.meta.env ? import.meta.env.SUPABASE_KEY : null);

    if (!supabaseUrl || !supabaseKey) {
      return storeMap || new Map();
    }

    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("merchants")
      .select("slug, is_publish, active_coupons_count");

    if (error || !data) {
      console.warn("Middleware: Failed to load merchants cache:", error);
      return storeMap || new Map();
    }

    const newMap = new Map<string, StoreStatus>();
    for (const row of data) {
      if (row.slug) {
        const slug = String(row.slug).toLowerCase().trim();
        const activeCount = Number(row.active_coupons_count || 0);
        newMap.set(slug, {
          exists: true,
          hasActiveCoupons: Boolean(row.is_publish && activeCount > 0),
          canonicalSlug: slug,
        });
      }
    }

    storeMap = newMap;
    lastFetchTime = now;
    return storeMap;
  } catch (err) {
    console.error("Middleware: Error populating storeMap:", err);
    return storeMap || new Map();
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const host = context.request.headers.get("host") || "";
  const hostname = host.split(":")[0].toLowerCase();
  const parts = hostname.split(".");
  const isSubdomain = parts.length >= 3 && !EXCLUDED.has(parts[0]);

  if (isSubdomain) {
    const rawSubdomain = parts[0];
    const canonicalSlug = SLUG_REDIRECTS[rawSubdomain] || rawSubdomain;
    const url = new URL(context.request.url);

    const map = await getStoreMap();
    let status = map.get(canonicalSlug);

    // Fallback single-lookup if store wasn't in cache
    if (!status) {
      try {
        const supabaseUrl =
          process.env.SUPABASE_URL ||
          (import.meta.env ? import.meta.env.SUPABASE_URL : null);
        const supabaseKey =
          process.env.SUPABASE_KEY ||
          (import.meta.env ? import.meta.env.SUPABASE_KEY : null);

        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import("@supabase/supabase-js");
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data } = await supabase
            .from("merchants")
            .select("slug, is_publish, active_coupons_count")
            .eq("slug", canonicalSlug)
            .maybeSingle();

          if (data) {
            status = {
              exists: true,
              hasActiveCoupons: Boolean(
                data.is_publish && Number(data.active_coupons_count || 0) > 0,
              ),
              canonicalSlug: data.slug,
            };
            map.set(canonicalSlug, status);
          }
        }
      } catch (e) {
        console.warn("Middleware single lookup error:", e);
      }
    }

    if (status?.hasActiveCoupons) {
      // 301 Permanent Redirect to root subfolder without trailing slash (preserves query params)
      const targetSlug = status.canonicalSlug || canonicalSlug;
      const search = url.search || "";
      return context.redirect(
        `https://${MAIN_DOMAIN}/stores/${targetSlug}${search}`,
        301,
      );
    } else if (status?.exists) {
      // Explicit 410 Gone for empty / thin / expired stores
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>410 - Offer Expired | Genie Coupon</title>
  <meta name="robots" content="noindex, nofollow">
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; text-align: center; }
    .box { max-width: 480px; padding: 2.5rem; background: #161922; border-radius: 12px; border: 1px solid #272a37; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { font-size: 1.75rem; margin-top: 0; margin-bottom: 0.75rem; color: #89E900; }
    p { color: #9ca3af; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.75rem; }
    a { display: inline-block; background: #89E900; color: #000; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: background 0.2s; }
    a:hover { background: #76c900; }
  </style>
</head>
<body>
  <div class="box">
    <h1>410 - Offer Expired</h1>
    <p>This store offer or promotional page is no longer active and has been permanently retired.</p>
    <a href="https://${MAIN_DOMAIN}/stores">Browse All Active Stores</a>
  </div>
</body>
</html>`,
        {
          status: 410,
          statusText: "Gone",
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        },
      );
    } else {
      // 410 Gone for untracked / spam wildcard subdomains (signals Googlebot to purge immediately)
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
  }

  context.locals.isSubdomain = false;
  context.locals.storeSlug = null;
  return next();
});
