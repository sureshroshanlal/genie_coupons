// utils/seo.js
export async function buildCanonical({
  origin,
  path,
  page,
  limit,
  q,
  categorySlug,
  storeSlug,
  sort,
}) {
  // Resolve possible Promises passed accidentally
  const resolvedOrigin = String(await Promise.resolve(origin || "")).trim();
  const resolvedPathRaw = String(await Promise.resolve(path || "")).trim();

  // Normalize path: ensure it starts with "/"
  const pathNorm = resolvedPathRaw
    ? resolvedPathRaw.startsWith("/")
      ? resolvedPathRaw
      : `/${resolvedPathRaw}`
    : "/";

  // Normalize origin: remove trailing slash(es) and add protocol if missing
  const normalizeOrigin = (raw) => {
    if (!raw) return "";
    let o = String(raw).trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(o)) o = `https://${o}`;
    return o;
  };
  const originNorm = normalizeOrigin(resolvedOrigin);

  // Helper to attach search params to a URL object OR to a relative path string
  const addSearchParamsTo = (baseUrlObject, basePathString) => {
    const params = new URLSearchParams();

    if (q) params.set("q", String(q));
    if (categorySlug) params.set("category", String(categorySlug));
    if (storeSlug) params.set("store", String(storeSlug));
    if (sort) params.set("sort", String(sort));
    if (page && Number(page) !== 1) params.set("page", String(page));
    if (limit && Number(limit) !== 20) params.set("limit", String(limit));

    // If baseUrlObject provided (an instance of URL), set its search
    if (baseUrlObject) {
      baseUrlObject.search = params.toString();
      return baseUrlObject.toString();
    }

    // Otherwise return relative path + query string
    const qs = params.toString();
    return qs
      ? `${basePathString}${basePathString.includes("?") ? "&" : "?"}${qs}`
      : basePathString;
  };

  // If we have a valid origin, build an absolute URL using URL()
  if (originNorm) {
    // join origin + path safely
    const candidate = `${originNorm.replace(/\/+$/, "")}${pathNorm}`;
    try {
      const u = new URL(candidate);
      return addSearchParamsTo(u, null);
    } catch (err) {
      // fallback: log and try to recover (return origin only or relative)
      console.error("buildCanonical: failed to construct absolute URL", {
        candidate,
        err: err && err.message,
      });
      // try to at least return origin without trailing slash
      return originNorm;
    }
  }

  // No origin provided — build a relative canonical path (safe for crawlers if used appropriately)
  try {
    return addSearchParamsTo(null, pathNorm);
  } catch (err) {
    console.error("buildCanonical: fallback failed", {
      pathNorm,
      err: err && err.message,
    });
    return "/";
  }
}
