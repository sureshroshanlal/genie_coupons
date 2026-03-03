// utils/pagination.js

/**
 * Normalize a backend path into a frontend route.
 * Strips common API prefixes (e.g. /api, /api/v1, /public, /public/v1, /public/vX)
 * Strips .json suffixes and querystrings, ensures leading slash and no trailing slash.
 *
 * Example:
 *  "/public/v1/coupons?type=all" -> "/coupons"
 */
function normalizePathToFrontend(rawPath, fallback = "/") {
  if (!rawPath) return fallback;
  let p = String(rawPath).trim();

  // discard querystring
  p = p.split("?")[0];

  // Common API prefixes to strip:
  // /api, /api/v1, /public, /public/v1, /public/v2, /public/v123, /api/v123
  p = p.replace(/^\/(api|public)(\/v?\d+)?/, "");

  // Also handle possible prefix like /public/v1/public/... (double) by collapsing repeated prefixes
  p = p.replace(/^(\/(api|public)(\/v?\d+)?)+/, "");

  // strip file suffixes like .json
  p = p.replace(/\.json$/i, "");

  // ensure leading slash
  if (!p.startsWith("/")) p = `/${p}`;

  // remove trailing slash except for root "/"
  if (p !== "/") p = p.replace(/\/+$/, "");

  return p || fallback;
}

function buildQueryString(paramsObj = {}) {
  const s = new URLSearchParams();
  Object.entries(paramsObj).forEach(([k, v]) => {
    if (v === undefined || v === null || String(v) === "") return;
    s.set(k, String(v));
  });
  const qs = s.toString();
  return qs ? `?${qs}` : "";
}

/**
 * buildPrevNext
 */
export function buildPrevNext({
  path,
  page = 1,
  limit = 20,
  total = 0,
  extraParams = {},
} = {}) {
  const totalPages = Math.max(
    Math.ceil((Number(total) || 0) / (Number(limit) || 1)),
    1
  );

  const frontendPath = normalizePathToFrontend(path, "/");

  const backendOrigin = (process.env.PUBLIC_API_BASE_URL || "")
    .toString()
    .trim()
    .replace(/\/+$/, "");

  const makeRelUrl = (targetPage) => {
    const params = { ...extraParams };
    if (targetPage && Number(targetPage) > 1) params.page = Number(targetPage);
    if (limit && Number(limit) !== 20) params.limit = Number(limit);
    const rel = `${frontendPath}${buildQueryString(params)}`;
    return backendOrigin ? `${backendOrigin}${rel}` : rel;
  };

  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  // Optional absolute canonical link: PUBLIC_SITE_URL + optional PUBLIC_BASE_PATH
  const canonicalOrigin = (process.env.PUBLIC_SITE_URL || "")
    .toString()
    .trim()
    .replace(/\/+$/, "");
  const basePath = (process.env.PUBLIC_BASE_PATH || "")
    .toString()
    .trim()
    .replace(/\/+$/, "");

  const maybeAbsolute = (rel) => {
    if (!rel) return null;
    if (canonicalOrigin) return `${canonicalOrigin}${basePath}${rel}`;
    return rel; // relative by default
  };

  return {
    prev: prevPage
      ? backendOrigin
        ? makeRelUrl(prevPage)
        : maybeAbsolute(makeRelUrl(prevPage))
      : null,
    next: nextPage
      ? backendOrigin
        ? makeRelUrl(nextPage)
        : maybeAbsolute(makeRelUrl(nextPage))
      : null,
    totalPages,
  };
}
