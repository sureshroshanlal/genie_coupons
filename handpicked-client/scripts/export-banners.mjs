// scripts/export-banners.mjs
// Usage: node scripts/export-banners.mjs
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

const SRC = path.join(process.cwd(), "src", "content", "banners.server.js");
const OUT_DIR = path.join(process.cwd(), "public", "_data");
const OUT_FILE = path.join(OUT_DIR, "banners.json");

async function main() {
  try {
    const mod = await import(pathToFileURL(SRC).href);
    // support both `export default banners` and `export const banners = [...]`
    const banners = mod.default ?? mod.banners ?? [];
    await fs.mkdir(OUT_DIR, { recursive: true });
    await fs.writeFile(OUT_FILE, JSON.stringify(banners, null, 2), "utf8");
    console.log("✅ wrote", OUT_FILE);
  } catch (err) {
    console.error("❌ export-banners failed:", err);
    process.exit(1);
  }
}

main();
