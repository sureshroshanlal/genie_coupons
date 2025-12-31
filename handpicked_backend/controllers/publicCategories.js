import * as CategoriesRepo from "../dbhelper/CategoriesRepoPublic.js";
import { ok, fail } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import { buildCanonical } from "../utils/seo.js";

function getOrigin(req) {
  try {
    return (
      (req.headers["x-forwarded-proto"]
        ? String(req.headers["x-forwarded-proto"])
        : req.protocol) +
      "://" +
      req.get("host")
    );
  } catch (err) {
    console.error("Failed to determine origin:", err);
    return "";
  }
}

function getPath(req) {
  try {
    return req.originalUrl ? req.originalUrl.split("?")[0] : req.path;
  } catch (err) {
    console.error("Failed to determine path:", err);
    return "/";
  }
}

export async function list(req, res) {
  try {
    const origin = getOrigin(req);
    const path = getPath(req);

    const result = await withCache(req, async () => {
      try {
        const data = await CategoriesRepo.listWithCounts();
        return {
          data: Array.isArray(data) ? data : [],
          meta: {
            total: Array.isArray(data) ? data.length : 0,
            canonical: buildCanonical({ origin, path }),
          },
        };
      } catch (err) {
        console.error("Failed to fetch categories:", err);
        return {
          data: [],
          meta: { total: 0, canonical: buildCanonical({ origin, path }) },
        };
      }
    });

    return ok(res, result);
  } catch (e) {
    console.error("Error in categories.list:", e);
    return fail(res, "Failed to load categories", e);
  }
}
