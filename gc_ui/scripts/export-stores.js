// scripts/export-stores.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sitemapPath = path.join(__dirname, "..", "public", "sitemaps", "sitemap-stores.xml");
const outPath = path.join(__dirname, "..", "src", "_data", "stores.json");

try {
  if (fs.existsSync(sitemapPath)) {
    const xml = fs.readFileSync(sitemapPath, "utf8");
    const urls = [...xml.matchAll(/<loc>https:\/\/geniecoupon\.com\/stores\/([^<]+)<\/loc>/g)].map((m) => m[1]);
    const storeMap = {};
    for (const slug of urls) {
      storeMap[slug.toLowerCase().trim()] = true;
    }
    const outDir = path.dirname(outPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(storeMap, null, 2), "utf8");
    console.log(`✅ Exported ${Object.keys(storeMap).length} active stores to ${outPath}`);
  } else {
    console.warn("⚠️ sitemap-stores.xml not found, skipping export-stores");
  }
} catch (err) {
  console.error("❌ Error in export-stores:", err);
}
