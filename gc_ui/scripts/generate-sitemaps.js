// scripts/generate-sitemaps.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import { SitemapStream, streamToPromise } from "sitemap";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOSTNAME = process.env.PUBLIC_SITE_URL; // https://geniecoupon.com
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!HOSTNAME || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "ERROR: PUBLIC_SITE_URL, SUPABASE_URL and SUPABASE_KEY must be set in env.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OUT_DIR = path.join(__dirname, "..", "public", "sitemaps");
const INDEX_OUT = path.join(__dirname, "..", "public", "sitemap-index.xml");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Fetchers ─────────────────────────────────────────────────────────────────

// Stores — each store lives at {slug}.geniecoupon.com
async function fetchStores() {
  const pageSize = 1000;
  let page = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from("merchants")
      .select("slug, updated_at")
      .eq("is_publish", true)
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`fetchStores error: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  return all.map((r) => ({
    // Store pages are subdomains — use full URL
    url: `https://${r.slug}.geniecoupon.com`,
    lastmod: r.updated_at
      ? new Date(r.updated_at).toISOString().slice(0, 10)
      : undefined,
    changefreq: "daily",
    priority: 1.0,
  }));
}

// Blogs
async function fetchBlogs() {
  const pageSize = 1000;
  let page = 0;
  let all = [];

  while (true) {
    const { data, error } = await supabase
      .from("blogs")
      .select("slug, updated_at")
      .eq("is_publish", true)
      .order("id", { ascending: true })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`fetchBlogs error: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    page++;
  }

  return all.map((r) => ({
    url: `/blogs/${r.slug}`,
    lastmod: r.updated_at
      ? new Date(r.updated_at).toISOString().slice(0, 10)
      : undefined,
    changefreq: "monthly",
    priority: 0.6,
  }));
}

async function fetchCategories() {
  const { data, error } = await supabase
    .from("merchant_categories")
    .select("id, slug, parent_id, updated_at")
    .eq("is_publish", true)
    .order("id", { ascending: true });

  if (error) throw new Error(`fetchCategories error: ${error.message}`);

  const all = data || [];

  // Build id → slug map for parent lookup
  const idToSlug = Object.fromEntries(all.map((r) => [r.id, r.slug]));

  return all.map((r) => {
    const lastmod = r.updated_at
      ? new Date(r.updated_at).toISOString().slice(0, 10)
      : undefined;

    const url = r.parent_id
      ? `/categories/${idToSlug[r.parent_id]}/${r.slug}`
      : `/categories/${r.slug}`;

    return {
      url,
      lastmod,
      changefreq: "weekly",
      priority: r.parent_id ? 0.6 : 0.7,
    };
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function writeSitemap(filename, items) {
  if (!items.length) {
    console.log(`  Skipped (empty): ${filename}`);
    return;
  }

  const finalPath = path.join(OUT_DIR, filename);
  const tmpPath = finalPath + ".tmp";

  // For subdomain URLs (stores), use their full URL directly
  // For relative URLs, SitemapStream prepends HOSTNAME
  const smStream = new SitemapStream({ hostname: HOSTNAME });

  items.forEach((i) => {
    smStream.write({
      url: i.url,
      lastmod: i.lastmod,
      changefreq: i.changefreq,
      priority: i.priority,
    });
  });

  smStream.end();
  const buffer = await streamToPromise(smStream);
  fs.writeFileSync(tmpPath, buffer);
  fs.renameSync(tmpPath, finalPath);
  console.log(`  Wrote: ${finalPath} (${items.length} URLs)`);
}

async function writeRawSitemap(filename, items) {
  const finalPath = path.join(OUT_DIR, filename);
  const tmpPath = finalPath + ".tmp";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items
  .map(
    (i) => `  <url>
    <loc>${i.url}</loc>${i.lastmod ? `\n    <lastmod>${i.lastmod}</lastmod>` : ""}
    <changefreq>${i.changefreq}</changefreq>
    <priority>${i.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  fs.writeFileSync(tmpPath, xml, "utf8");
  fs.renameSync(tmpPath, finalPath);
  console.log(`  Wrote: ${finalPath} (${items.length} URLs)`);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

(async function main() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    console.log("\n🗺️  Generating sitemaps...\n");

    // 1. Static pages
    const pages = [
      { url: "/", lastmod: today, changefreq: "daily", priority: 1.0 },
      { url: "/stores", lastmod: today, changefreq: "daily", priority: 0.9 },
      {
        url: "/categories",
        lastmod: today,
        changefreq: "daily",
        priority: 0.9,
      },
      { url: "/blogs", lastmod: today, changefreq: "daily", priority: 0.7 },
      {
        url: "/todays-deals",
        lastmod: today,
        changefreq: "daily",
        priority: 0.9,
      },
      { url: "/about", lastmod: today, changefreq: "yearly", priority: 0.4 },
      { url: "/contact", lastmod: today, changefreq: "yearly", priority: 0.4 },
      { url: "/careers", lastmod: today, changefreq: "yearly", priority: 0.3 },
      {
        url: "/privacy-policy",
        lastmod: today,
        changefreq: "yearly",
        priority: 0.3,
      },
      {
        url: "/terms-and-conditions",
        lastmod: today,
        changefreq: "yearly",
        priority: 0.3,
      },
      {
        url: "/affiliate-disclosure",
        lastmod: today,
        changefreq: "yearly",
        priority: 0.3,
      },
      {
        url: "/how-it-works",
        lastmod: today,
        changefreq: "yearly",
        priority: 0.4,
      },
      { url: "/faq", lastmod: today, changefreq: "yearly", priority: 0.4 },
    ];
    await writeSitemap("sitemap-pages.xml", pages);

    // 2. Store subdomains
    const stores = await fetchStores();
    console.log(`  Fetched ${stores.length} active stores`);
    const storeChunks = chunk(stores, 40000);
    for (let i = 0; i < storeChunks.length; i++) {
      const name =
        storeChunks.length === 1
          ? "sitemap-stores.xml"
          : `sitemap-stores-${i + 1}.xml`;
      await writeRawSitemap(name, storeChunks[i]);
    }

    // 3. Blogs
    const blogs = await fetchBlogs();
    console.log(`  Fetched ${blogs.length} published blogs`);
    const blogChunks = chunk(blogs, 40000);
    for (let i = 0; i < blogChunks.length; i++) {
      const name =
        blogChunks.length === 1
          ? "sitemap-blogs.xml"
          : `sitemap-blogs-${i + 1}.xml`;
      await writeSitemap(name, blogChunks[i]);
    }

    // 4. Categories
    const categories = await fetchCategories();
    console.log(`  Fetched ${categories.length} categories`);
    await writeSitemap("sitemap-categories.xml", categories);

    // 5. Sitemap index
    const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".xml"));
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files
  .map(
    (f) =>
      `  <sitemap>\n    <loc>${HOSTNAME}/sitemaps/${f}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
  )
  .join("\n")}
</sitemapindex>`;

    const tmpIndex = INDEX_OUT + ".tmp";
    fs.writeFileSync(tmpIndex, indexXml, "utf8");
    fs.renameSync(tmpIndex, INDEX_OUT);
    console.log(`\n  Wrote index: ${INDEX_OUT}`);
    console.log(
      `\n✅ Sitemap generation complete. ${files.length} sitemaps indexed.\n`,
    );
    process.exit(0);
  } catch (err) {
    console.error("❌ Error generating sitemaps:", err);
    process.exit(1);
  }
})();
