// lib/request-helpers.js
function normalizeOrigin(raw) {
  if (!raw) return "";
  let o = String(raw).trim();
  // strip trailing slashes
  o = o.replace(/\/+$/, "");
  // add https protocol if missing
  if (!/^https?:\/\//i.test(o)) {
    o = `https://${o}`;
  }
  return o;
}

/**
 * getOrigin(req, opts)
 */
export async function getOrigin(req, { trustProxy = false } = {}) {
  // 1) canonical override (recommended)
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.PUBLIC_SITE_URL
  ) {
    return normalizeOrigin(process.env.PUBLIC_SITE_URL);
  }

  try {
    // 2) trusted proxy headers (only if you opt in)
    if (trustProxy && req && req.headers) {
      const xfProto =
        req.headers["x-forwarded-proto"] || req.headers["x-forwarded-protocol"];
      const xfHost =
        req.headers["x-forwarded-host"] || req.headers["x-forwarded-server"];
      if (xfProto && xfHost) {
        return normalizeOrigin(`${xfProto}://${xfHost}`);
      }

      const forwarded = req.headers["forwarded"];
      if (forwarded) {
        const protoMatch = forwarded.match(/proto=([^;,\s]+)/i);
        const hostMatch = forwarded.match(/host=([^;,\s]+)/i);
        if (protoMatch && hostMatch) {
          return normalizeOrigin(`${protoMatch[1]}://${hostMatch[1]}`);
        }
      }
    }

    // 3) express fallback
    const protocol =
      (req && req.protocol) ||
      (req && req.headers && (req.headers["x-forwarded-proto"] || "http"));
    const host =
      (req && typeof req.get === "function" && req.get("host")) ||
      (req && req.headers && req.headers.host);
    if (protocol && host) {
      return normalizeOrigin(`${protocol}://${host}`);
    }
  } catch (err) {
    // swallow, fallback to empty string
  }

  return "";
}

/**
 * getPath(req)
 * - Uses originalUrl if available (removes querystring)
 * - Falls back to req.path or req.url
 */
export async function getPath(req) {
  try {
    if (!req) return "";
    const original = req.originalUrl || req.url || req.path || "";
    return String(original).split("?")[0];
  } catch {
    return "";
  }
}
