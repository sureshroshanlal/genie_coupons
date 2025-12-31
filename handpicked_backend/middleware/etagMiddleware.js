import crypto from "crypto";

/**
ETag middleware for JSON responses.
Hashes response body (SHA-256, base64url)
Sets ETag and Cache-Control (if not already set)
Handles If-None-Match for 304
*/

export function etagMiddleware(req, res, next) {
  // Intercept only JSON responses
  const originalJson = res.json.bind(res);

  res.json = function jsonWithETag(body) {
    try {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      const hash = crypto
        .createHash("sha256")
        .update(payload)
        .digest("base64url");
      const etag = `W/${hash}`; // Weak ETag is fine for JSON
      // If client sent If-None-Match and matches current ETag => 304
      const inm = req.headers["if-none-match"];
      if (inm && inm === etag) {
        res.status(304);
        // Preserve caching headers
        if (!res.get("Cache-Control")) {
          res.set(
            "Cache-Control",
            "public, max-age=300, stale-while-revalidate=86400"
          );
        }
        res.set("ETag", etag);
        return res.end();
      }

      // Set headers for fresh response
      if (!res.get("Cache-Control")) {
        res.set(
          "Cache-Control",
          "public, max-age=300, stale-while-revalidate=86400"
        );
      }
      res.set("ETag", etag);

      return originalJson(body);
    } catch (e) {
      // On any error, fall back to normal json
      return originalJson(body);
    }
  };
}
