// controllers/publicAuthors.js
import * as AuthorsRepo from "../dbhelper/AuthorsRepo.js";
import { ok, fail, notFound } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import { valLimit } from "../utils/validation.js";
import { badRequest } from "../utils/errors.js";
import { makeListCacheKey } from "../utils/cacheKey.js";

/**
 * GET /public/v1/authors
 * List all authors
 */
export async function list(req, res) {
  try {
    const limit = valLimit(req.query.limit);

    const cacheKey = makeListCacheKey("authors", { limit });

    const result = await withCache(
      req,
      async () => {
        const rows = await AuthorsRepo.listAuthors({ limit });
        return {
          data: rows,
          meta: { total: rows.length },
        };
      },
      { ttlSeconds: 120, keyExtra: cacheKey },
    );

    return ok(res, result);
  } catch (e) {
    console.error("Authors list controller error:", e);
    return fail(res, "Failed to list authors", e);
  }
}

/**
 * GET /public/v1/authors/:slug
 * Author profile + stores they verified
 */
export async function detail(req, res) {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) return badRequest(res, "Invalid author slug");

    const cacheKey = makeListCacheKey("authors", { slug });

    const result = await withCache(
      req,
      async () => {
        const author = await AuthorsRepo.getAuthorBySlug(slug);
        if (!author) return { data: null, meta: { status: 404 } };

        const stores = await AuthorsRepo.getStoresByAuthor(author.id);

        const storesCount = await AuthorsRepo.countStoresVerifiedByAuthor(author.id);
        return {
          data: {
            ...author,
            stores,
            stores_count: storesCount,
          },
          meta: {
            generated_at: new Date().toISOString(),
          },
        };
      },
      { ttlSeconds: 120, keyExtra: cacheKey },
    );

    if (!result?.data) return notFound(res, "Author not found");
    return ok(res, result);
  } catch (e) {
    console.error("Author detail controller error:", e);
    return fail(res, "Failed to get author detail", e);
  }
}
