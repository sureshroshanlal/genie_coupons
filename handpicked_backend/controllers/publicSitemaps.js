import * as StoresRepo from "../dbhelper/StoresRepoPublic.js";
import * as BlogsRepo from "../dbhelper/BlogsRepoPublic.js";
import { withCache } from "../utils/cache.js";

// Safe origin helper
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

// Escape XML special chars
function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Build sitemap XML from URLs
function buildSitemapXml(urls) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const u of urls) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(u.loc)}</loc>`);
    if (u.lastmod) lines.push(`    <lastmod>${escapeXml(u.lastmod)}</lastmod>`);
    if (u.changefreq)
      lines.push(`    <changefreq>${escapeXml(u.changefreq)}</changefreq>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
}

// Stores sitemap
export async function stores(req, res) {
  const origin = getOrigin(req);
  res.setHeader("Content-Type", "application/xml");

  try {
    const payload = await withCache(
      req,
      async () => {
        const { slugs } = await StoresRepo.listSlugs();
        const urls = (slugs || []).map((s) => ({
          loc: `${origin}/stores/${s.slug}`,
          lastmod: s.updated_at
            ? new Date(s.updated_at).toISOString()
            : undefined,
          changefreq: "daily",
        }));
        return { xml: buildSitemapXml(urls) };
      },
      { ttlSeconds: 300, keyExtra: "sitemap" }
    );

    return res.status(200).send(payload.xml || buildSitemapXml([]));
  } catch (e) {
    console.error("Stores sitemap generation failed:", e);
    return res.status(200).send(buildSitemapXml([]));
  }
}

// Blogs sitemap
export async function blogs(req, res) {
  const origin = getOrigin(req);
  res.setHeader("Content-Type", "application/xml");

  try {
    const payload = await withCache(
      req,
      async () => {
        const { slugs } = await BlogsRepo.listSlugs();
        const urls = (slugs || []).map((b) => ({
          loc: `${origin}/blog/${b.slug}`,
          lastmod: b.updated_at
            ? new Date(b.updated_at).toISOString()
            : undefined,
          changefreq: "weekly",
        }));
        return { xml: buildSitemapXml(urls) };
      },
      { ttlSeconds: 300, keyExtra: "sitemap" }
    );

    return res.status(200).send(payload.xml || buildSitemapXml([]));
  } catch (e) {
    console.error("Blogs sitemap generation failed:", e);
    return res.status(200).send(buildSitemapXml([]));
  }
}
