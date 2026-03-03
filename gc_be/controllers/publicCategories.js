// controllers/publicCategories.js
import * as CategoriesRepo from "../dbhelper/CategoriesRepoPublic.js";
import { ok, fail, notFound } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import {
  valLimit,
  valEnum,
  valLocale,
  deriveLocale,
} from "../utils/validation.js";
import { badRequest } from "../utils/errors.js";
import { CATEGORY_SORTS } from "../constants/publicEnums.js";
import { getOrigin, getPath } from "../utils/request-helper.js";
import { makeListCacheKey } from "../utils/cacheKey.js";

/**
 * GET /public/v1/categories
 * Cursor-based pagination, root categories only (parent_id IS NULL)
 */
export async function list(req, res) {
  try {
    const limit = valLimit(req.query.limit);
    const sort = valEnum(req.query.sort, CATEGORY_SORTS, "name");
    const locale = valLocale(req.query.locale) || deriveLocale(req);
    const qRaw = String(req.query.q || "");
    const q = qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw;
    const letter = String(req.query.letter || "All").trim();
    const cursor = String(req.query.cursor || "");

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const showHome = req.query.show_home === "true";

    const params = {
      q: q.trim(),
      sort,
      locale,
      limit,
      origin,
      path,
      letter,
      cursor: cursor || null,
      showHome,
    };

    const cacheKey = makeListCacheKey("categories", {
      limit,
      q: params.q || "",
      sort: params.sort || "",
      locale: params.locale || "",
      letter: params.letter || "",
      cursor: params.cursor || "",
      showHome: String(showHome),
    });

    const result = await withCache(
      req,
      async () => {
        const { rows, total, nextCursor } = await CategoriesRepo.list(params);

        const canonical = null;

        return {
          data: rows,
          meta: {
            limit,
            total,
            canonical,
            nextCursor,
          },
        };
      },
      { ttlSeconds: 60, keyExtra: cacheKey },
    );

    return ok(res, result);
  } catch (e) {
    console.error("Categories list controller error:", e);
    return fail(res, "Failed to list categories", e);
  }
}

/**
 * GET /public/v1/categories/:slug - Parent category with subcategories
 */
export async function detail(req, res) {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) return badRequest(res, "Invalid category slug");

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const params = { slug, origin, path };

    const cacheKey = makeListCacheKey("categories", { slug });

    const result = await withCache(
      req,
      async () => {
        const category = await CategoriesRepo.getBySlug(params.slug);
        if (!category) return { data: null, meta: { status: 404 } };

        return {
          data: category,
          meta: {
            generated_at: new Date().toISOString(),
            canonical: null,
          },
        };
      },
      { ttlSeconds: 60, keyExtra: cacheKey },
    );

    if (!result?.data) return notFound(res, "Category not found");
    return ok(res, result);
  } catch (e) {
    console.error("Category detail controller error:", e);
    return fail(res, "Failed to get category detail", e);
  }
}

/**
 * GET /public/v1/categories/:parentSlug/:subSlug - Subcategory with merchants
 */
export async function subcategoryDetail(req, res) {
  try {
    const parentSlug = String(req.params.parentSlug || "")
      .trim()
      .toLowerCase();
    const subSlug = String(req.params.subSlug || "")
      .trim()
      .toLowerCase();

    if (!parentSlug || !subSlug) {
      return badRequest(res, "Invalid category or subcategory slug");
    }

    const cursor = req.query.cursor || null;
    const limit = valLimit(req.query.limit) || 20;

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const params = { parentSlug, subSlug, cursor, limit, origin, path };

    const cacheKey = makeListCacheKey("subcategories", {
      parentSlug,
      subSlug,
      cursor,
      limit,
    });

    const result = await withCache(
      req,
      async () => {
        const data = await CategoriesRepo.getSubcategoryBySlug(
          params.parentSlug,
          params.subSlug,
          { cursor: params.cursor, limit: params.limit },
        );

        if (!data) return { data: null, meta: { status: 404 } };

        return {
          data,
          meta: {
            generated_at: new Date().toISOString(),
            canonical: null,
          },
        };
      },
      { ttlSeconds: 60, keyExtra: cacheKey },
    );

    if (!result?.data) {
      return notFound(res, "Subcategory not found");
    }

    return ok(res, result);
  } catch (e) {
    console.error("Subcategory detail controller error:", e);
    return fail(res, "Failed to get subcategory detail", e);
  }
}
