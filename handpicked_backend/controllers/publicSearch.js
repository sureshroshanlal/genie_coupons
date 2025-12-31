import * as SearchRepo from "../dbhelper/SearchRepoPublic.js";
import { ok, fail } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import { requireQ, valLimit } from "../utils/validation.js";
import { buildCanonical } from "../utils/seo.js";

/* helpers copied from other controllers for canonical/path/origin */
function getOrigin(req) {
  try {
    return (
      (req.headers["x-forwarded-proto"]
        ? String(req.headers["x-forwarded-proto"])
        : req.protocol) +
      "://" +
      req.get("host")
    );
  } catch {
    return "";
  }
}
function getPath(req) {
  try {
    return req.originalUrl ? req.originalUrl.split("?")[0] : req.path;
  } catch {
    return "/";
  }
}

export async function searchStores(req, res) {
  try {
    const qRaw = req.query.q;
    const q = qRaw ? String(qRaw).trim().slice(0, 200) : "";
    const limit = valLimit(req.query.limit || req.query.limit_per_type || 6);

    // allow empty q to return empty shape (keeps UI stable)
    if (!q) {
      const meta = {
        q: "",
        limit,
        canonical: buildCanonical({
          origin: getOrigin(req),
          path: getPath(req),
        }),
      };
      return ok(res, { data: { stores: [] }, meta });
    }

    const params = { q, limit, origin: getOrigin(req), path: getPath(req) };

    // cache short-lived to reduce duplicate load for identical queries
    const result = await withCache(
      req,
      async () => {
        try {
          const stores = await SearchRepo.searchStores(params);
          return { data: { stores }, meta: { q, limit } };
        } catch (repoErr) {
          console.error("SearchRepo.searchStores error:", repoErr);
          // return safe empty shape (controller-level failure already logged)
          return { data: { stores: [] }, meta: { q, limit } };
        }
      },
      { ttlSeconds: 30, keyExtra: "search" } // short TTL for search suggestions
    );

    // attach canonical for SEO / shareability
    result.meta = result.meta || {};
    result.meta.canonical = buildCanonical({
      origin: params.origin,
      path: params.path,
      q: params.q,
      limit: params.limit,
    });

    return ok(res, result);
  } catch (err) {
    console.error("searchStores controller error:", err);
    return fail(res, "Search failed", err);
  }
}
