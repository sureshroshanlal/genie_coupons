// controllers/publicBlogs.js
import * as BlogsRepo from "../dbhelper/BlogsRepoPublic.js";
import { ok, fail, notFound } from "../utils/http.js";
import { withCache } from "../utils/cache.js";
import { buildCanonical } from "../utils/seo.js";
import {
  valPage,
  valLimit,
  valEnum,
  valLocale,
  deriveLocale,
} from "../utils/validation.js";
import { badRequest } from "../utils/errors.js";
import { buildArticleJsonLd } from "../utils/jsonld.js";
import { getOrigin, getPath } from "../utils/request-helper.js";
import { buildPrevNext } from "../utils/pagination.js";
import { makeListCacheKey } from "../utils/cacheKey.js";

export async function list(req, res) {
  try {
    // Validate paging + query params
    const page = valPage(req.query.page);
    const limit = valLimit(req.query.limit);
    const sort = valEnum(req.query.sort, ["latest", "featured"], "latest");
    const locale = valLocale(req.query.locale) || deriveLocale(req);

    // category_id numeric param (optional)
    const categoryId = req.query.category_id
      ? Number(req.query.category_id)
      : null;
    if (req.query.category_id && !Number.isFinite(categoryId)) {
      return badRequest(res, "Invalid category_id");
    }

    const qRaw = String(req.query.q || "");
    const q = qRaw.length > 200 ? qRaw.slice(0, 200) : qRaw;

    // Resolve origin/path (helpers may be sync or async)
    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const params = {
      q: q.trim(),
      categoryId,
      sort,
      locale,
      page,
      limit,
      origin,
      path,
    };

    // Deterministic cache key — use categoryId (numeric) not categorySlug
    const cacheKey = makeListCacheKey("blogs", {
      page,
      limit,
      q: params.q || "",
      category: params.categoryId ?? "",
      sort: params.sort || "",
      locale: params.locale || "",
      type: "",
    });

    const result = await withCache(
      req,
      async () => {
        try {
          // BlogsRepo.list returns { rows, total } per your repo implementation
          const { rows, total } = await BlogsRepo.list(params);

          // Build prev/next using total (repo provided)
          const nav = buildPrevNext({
            origin: params.origin,
            path: params.path,
            page,
            limit,
            total,
            extraParams: {
              q: params.q || undefined,
              category_id: params.categoryId || undefined,
              sort: params.sort,
              locale: params.locale || undefined,
            },
          });

          // Build canonical safely (await in case buildCanonical is async)
          const canonical = await buildCanonical({
            origin: params.origin,
            path: params.path,
            page,
            limit,
            q: params.q,
            // categorySlug not used here; keep contract minimal
            sort: params.sort,
          });

          return {
            data: rows,
            meta: {
              page,
              limit,
              total,
              canonical,
              prev: nav.prev,
              next: nav.next,
              total_pages: nav.totalPages,
            },
          };
        } catch (err) {
          console.error("Failed to fetch blogs list:", err);
          // keep response shape stable on error
          return {
            data: [],
            meta: {
              page,
              limit,
              total: 0,
              canonical: await buildCanonical({
                origin: params.origin,
                path: params.path,
                page,
                limit,
              }),
              prev: null,
              next: null,
              total_pages: 1,
            },
          };
        }
      },
      { ttlSeconds: 60, keyExtra: cacheKey }
    );

    // Prevent CDN/stale caching while debugging/paging — remove or relax for production if desired
    res.setHeader(
      "Cache-Control",
      "no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
    );

    return ok(res, result);
  } catch (e) {
    console.error("Error in blogs.list:", e);
    return fail(res, "Failed to list blogs", e);
  }
}

export async function detail(req, res) {
  try {
    const slug = String(req.params.slug || "")
      .trim()
      .toLowerCase();
    if (!slug) return badRequest(res, "Invalid blog slug");

    // Keep paging validators in case blog detail uses pagination for related items
    const page = valPage(req.query.page);
    const limit = valLimit(req.query.limit);

    const origin = await Promise.resolve(getOrigin(req, { trustProxy: false }));
    const path = await Promise.resolve(getPath(req));

    const locale = valLocale(req.query.locale) || deriveLocale(req);
    const params = {
      slug,
      page,
      limit,
      origin,
      path,
      locale,
      q: (req.query.q || "").toString().slice(0, 200),
    };

    const cacheKey = makeListCacheKey("blogs", {
      page,
      limit,
      q: params.q || "",
      category: "",
      sort: "",
      locale: params.locale || "",
      type: "",
    });

    const result = await withCache(
      req,
      async () => {
        try {
          const blog = await BlogsRepo.getBySlug(slug);
          if (!blog) return { data: null, meta: { status: 404 } };

          const canonical = await buildCanonical({
            origin: params.origin,
            path: params.path,
            page: params.page,
          });
          const seo = BlogsRepo.buildSeo(blog, {
            canonical,
            locale: params.locale,
          });
          const breadcrumbs = BlogsRepo.buildBreadcrumbs(blog, params);
          const articleJsonLd = buildArticleJsonLd(blog, params.origin);
          const breadcrumbJsonLd = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbs.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: b.name,
              item: b.url,
            })),
          };
          const related = await BlogsRepo.related(blog, 6);
          return {
            data: {
              id: blog.id,
              slug: blog.slug,
              title: blog.title,
              hero_image_url: blog.hero_image_url,
              category: blog.category || null,
              author: blog.author || {},
              created_at: blog.created_at,
              updated_at: blog.updated_at,
              seo,
              breadcrumbs,
              content_html: blog.content_html,
            },
            related,
            meta: {
              canonical,
              jsonld: { article: articleJsonLd, breadcrumb: breadcrumbJsonLd },
            },
          };
        } catch (err) {
          console.error("Failed to fetch blog detail:", err);
          throw err;
        }
      },
      { ttlSeconds: 300, keyExtra: cacheKey }
    );

    if (!result?.data) return notFound(res, "Blog not found");

    return ok(res, result);
  } catch (e) {
    console.error("Error in blogs.detail:", e);
    return fail(res, "Failed to get blog detail", e);
  }
}
