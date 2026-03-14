// src/controllers/publicBanners.js
import * as BannersRepo from "../dbhelper/BannersRepoPublic.js";
import { ok, fail } from "../utils/http.js";
import { withCache } from "../utils/cache.js";

/**
 * GET /public/v1/banners
 * Returns active banners for the homepage carousel.
 * Cache TTL: 5 minutes.
 */
export async function list(req, res) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const result = await withCache(
      req,
      async () => {
        const banners = await BannersRepo.listActive({ limit });
        return {
          data: banners,
          meta: {
            total: banners.length,
            generated_at: new Date().toISOString(),
          },
        };
      },
      { ttlSeconds: 300, keyExtra: `banners-active-${limit}` },
    );

    return ok(res, result);
  } catch (e) {
    console.error("publicBanners.list error:", e);
    return fail(res, "Failed to fetch banners", e);
  }
}
