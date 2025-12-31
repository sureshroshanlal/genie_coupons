// scripts/generate-sitemaps.js
import "dotenv/config";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { SitemapStream, streamToPromise } from "sitemap";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOSTNAME = process.env.PUBLIC_SITE_URL;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  // set any options you need here
});

const OUT_DIR = path.join(__dirname, "..", "public", "sitemaps");
const INDEX_OUT = path.join(__dirname, "..", "public", "sitemap-index.xml");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ---------------- Fetchers (Supabase) ----------------
// merchants table: id, slug, updated_at, active
async function fetchStores_supabase() {
  const { data, error } = await supabase
    .from("merchants")
    .select("slug, updated_at")
    .eq("active", true);

  if (error) {
    throw new Error(`Supabase fetchStores error: ${error.message}`);
  }
  return (data || []).map(r => ({
    url: `/stores/${r.slug}`,
    lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0,10) : undefined,
    changefreq: 'weekly',
    priority: 0.7
  }));
}

// blogs table: id, slug, updated_at, is_publish
async function fetchBlog_supabase() {
  const { data, error } = await supabase
    .from("blogs")
    .select("slug, updated_at")
    .eq("is_publish", true);

  if (error) {
    throw new Error(`Supabase fetchBlog error: ${error.message}`);
  }
  return (data || []).map(r => ({
    url: `/blog/${r.slug}`,
    lastmod: r.updated_at ? new Date(r.updated_at).toISOString().slice(0,10) : undefined,
    changefreq: 'monthly',
    priority: 0.6
  }));
}

// ----------------- helpers -----------------
async function writeGzippedSitemap(filename, items) {
  const filepath = path.join(OUT_DIR, filename);
  const smStream = new SitemapStream({ hostname: HOSTNAME });
  const gzipStream = smStream.pipe(zlib.createGzip());
  items.forEach((i) => {
    const entry = {
      url: i.url,
      lastmod: i.lastmod,
      changefreq: i.changefreq,
      priority: i.priority,
    };
    smStream.write(entry);
  });
  smStream.end();
  const buffer = await streamToPromise(gzipStream);
  fs.writeFileSync(filepath, buffer);
  console.log("Wrote", filepath);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// --------------- main ---------------
(async function main() {
  try {
    const today = new Date().toISOString().slice(0, 10);

    // 1) pages (static indexes) — includes /coupons only as a listing page
    const pages = [
      { url: "/", lastmod: today, changefreq: "daily", priority: 1.0 },
      { url: "/stores", lastmod: today, changefreq: "daily", priority: 0.8 },
      { url: "/coupons", lastmod: today, changefreq: "daily", priority: 0.8 },
      { url: "/blogs", lastmod: today, changefreq: "daily", priority: 0.6 },

      // Static pages
      { url: "/about", lastmod: today, changefreq: "yearly", priority: 0.5 },
      { url: "/contact", lastmod: today, changefreq: "yearly", priority: 0.5 },
      { url: "/careers", lastmod: today, changefreq: "yearly", priority: 0.5,},
      { url: "/press", lastmod: today, changefreq: "yearly", priority: 0.5 },
      { url: "/privacy", lastmod: today, changefreq: "yearly", priority: 0.5 },
      { url: "/terms", lastmod: today, changefreq: "yearly", priority: 0.5 },
      { url: "/how-it-works", lastmod: today, changefreq: "yearly", priority: 0.5,},
      { url: "/faq", lastmod: today, changefreq: "yearly", priority: 0.5 },
    ];
    await writeGzippedSitemap("sitemap-pages.xml.gz", pages);

    // 2) stores (per-store pages) from Supabase
    const stores = await fetchStores_supabase();
    const storeChunks = chunk(stores, 40000);
    for (let i = 0; i < storeChunks.length; i++) {
      const name =
        storeChunks.length === 1
          ? "sitemap-stores.xml.gz"
          : `sitemap-stores-${i + 1}.xml.gz`;
      await writeGzippedSitemap(name, storeChunks[i]);
    }

    // 3) blog (per-post pages) from Supabase
    const posts = await fetchBlog_supabase();
    const postChunks = chunk(posts, 40000);
    for (let i = 0; i < postChunks.length; i++) {
      const name =
        postChunks.length === 1
          ? "sitemap-blog.xml.gz"
          : `sitemap-blog-${i + 1}.xml.gz`;
      await writeGzippedSitemap(name, postChunks[i]);
    }

    // 4) build sitemap-index.xml pointing at all .xml.gz files we just wrote
    const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".xml.gz"));
    const indexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${files
  .map(
    (f) =>
      `  <sitemap>\n    <loc>${HOSTNAME}/sitemaps/${f}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;
    fs.writeFileSync(INDEX_OUT, indexXml, "utf8");
    console.log("Wrote", INDEX_OUT);

    console.log("Sitemap generation complete.");
    process.exit(0);
  } catch (err) {
    console.error("Error generating sitemaps:", err);
    process.exit(1);
  }
})();
