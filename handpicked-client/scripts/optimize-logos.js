import fs from "fs";
import path from "path";
import sharp from "sharp";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.join(__dirname, "../public/optimized/logos");
const MANIFEST_PATH = path.join(OUT_DIR, "manifest.json");
const SIZES = [64, 128, 256];
const BLUR_WIDTH = 20;
const QUALITY = 75;

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_KEY env vars before running.");
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function processLogo(id, url) {
  try {
    const buf = await download(url);
    const baseName = String(id).replace(/\s+/g, "-").toLowerCase();
    const variants = [];

    for (const w of SIZES) {
      const outName = `${baseName}-${w}.webp`;
      const outPath = path.join(OUT_DIR, outName);
      await sharp(buf)
        .resize({ width: w })
        .webp({ quality: QUALITY })
        .toFile(outPath);
      variants.push({ src: `/optimized/logos/${outName}`, width: w });
    }

    const blurBuf = await sharp(buf)
      .resize({ width: BLUR_WIDTH })
      .webp({ quality: 30 })
      .toBuffer();
    const blurDataURL = `data:image/webp;base64,${blurBuf.toString("base64")}`;

    return { id: baseName, variants, blurDataURL };
  } catch (err) {
    console.error(`Error processing ${id}:`, err.message || err);
    return null;
  }
}

async function fetchFromSupabase() {
  const url = process.env.SUPABASE_URL.replace(/\/$/, "");
  const key = process.env.SUPABASE_KEY;
  const endpoint = `${url}/rest/v1/merchants?select=id,logo_url`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error("Supabase fetch failed: " + res.status);
  const json = await res.json();
  return json.map((r) => ({ id: r.id, url: r.logo_url })).filter((x) => x.url);
}

(async () => {
  try {
    const list = await fetchFromSupabase();
    if (!list.length) {
      console.log("No merchants found. Exiting.");
      return;
    }

    const results = [];
    for (const item of list) {
      process.stdout.write(`Processing ${item.id} ... `);
      const r = await processLogo(item.id, item.url);
      if (r) {
        results.push(r);
        console.log("done");
      } else {
        console.log("skipped");
      }
    }

    const manifest = results.reduce((acc, cur) => {
      acc[cur.id] = {
        variants: cur.variants,
        blurDataURL: cur.blurDataURL,
      };
      return acc;
    }, {});
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log("Manifest written to", MANIFEST_PATH);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
