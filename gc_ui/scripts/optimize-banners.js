#!/usr/bin/env node
/**
 * scripts/optimize-banner.js
 *
 * - Finds files named like: banner1-..., banner2-..., banner3.png etc in inputDir
 * - Removes any existing optimized files in outputDir that match banner<number>*
 * - Generates responsive WebP / AVIF as banner<number>-<width>.(webp|avif)
 * - Emits a tiny blur placeholder (webp base64)
 * - Writes a manifest to public/_data/banners.json for runtime consumption
 *
 * Usage:
 *   node scripts/optimize-banner.js
 *   node scripts/optimize-banner.js --inputDir=public/images --outputDir=public/optimized --sizes=320,480,768,1024,1600
 */

import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------- CLI parsing -----------------
const argv = Object.fromEntries(
  process.argv
    .slice(2)
    .map((arg) => arg.split("="))
    .map(([k, v]) => [k.replace(/^--/, ""), v ?? true])
);

const inputDir =
  argv.inputDir || path.join(__dirname, "..", "public", "images");
const outputDir =
  argv.outputDir || path.join(__dirname, "..", "public", "optimized");
const publicDir = path.join(__dirname, "..", "public");
const dataDir = path.join(publicDir, "_data");
const manifestPath = path.join(dataDir, "banners.json");

const sizes = (argv.sizes || "320,480,768,1024,1600").split(",").map(Number);
const qualityWebp = Number(argv.qualityWebp ?? 75);
const qualityAvif = Number(argv.qualityAvif ?? 50);
const placeholderSize = Number(argv.placeholderSize ?? 20);

// regex matches files that start with "banner" followed by a number (banner1, banner2, banner10, etc)
const BANNER_RE = /^banner(\d+)/i;

// ----------------- helpers -----------------
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function removeOldOptimizedFilesFor(bannerKey, outDir) {
  let existing = [];
  try {
    existing = await fs.readdir(outDir);
  } catch {
    return;
  }

  const toRemove = existing.filter((f) => f.startsWith(bannerKey + "-"));
  for (const fname of toRemove) {
    const p = path.join(outDir, fname);
    try {
      await fs.unlink(p);
      process.stdout.write(`removed ${fname} `);
    } catch (err) {
      console.warn(`failed to remove ${fname}: ${err.message}`);
    }
  }
}

function publicUrlFor(filePath) {
  // returns a web-safe path relative to public/ (e.g., optimized/banner3-320.webp)
  const rel = path.relative(publicDir, filePath).replace(/\\/g, "/");
  return "/" + rel;
}

// ----------------- main -----------------
async function optimize() {
  console.log("→ Banner optimizer starting");
  console.log(`  inputDir: ${inputDir}`);
  console.log(`  outputDir: ${outputDir}`);
  console.log(`  manifest: ${manifestPath}`);
  console.log(`  sizes: ${sizes.join(", ")}`);
  await ensureDir(outputDir);
  await ensureDir(dataDir);

  let files;
  try {
    files = await fs.readdir(inputDir);
  } catch (err) {
    console.error(`Error reading inputDir "${inputDir}":`, err.message);
    process.exit(1);
  }

  const bannerFiles = files.filter((f) => BANNER_RE.test(f));
  if (!bannerFiles.length) {
    console.log("No banner files found matching /^banner(\\d+)/ in", inputDir);
    // ensure we remove manifest if none found
    try {
      await fs.writeFile(manifestPath, JSON.stringify({}, null, 2), "utf8");
      console.log("Wrote empty manifest.");
    } catch (e) {
      console.warn("Failed to write empty manifest:", e.message);
    }
    return;
  }

  const manifest = {};

  for (const file of bannerFiles) {
    const filePath = path.join(inputDir, file);
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch (err) {
      console.warn(`Skipping ${file} — stat failed: ${err.message}`);
      continue;
    }
    if (!stat.isFile()) continue;

    const match = file.match(BANNER_RE);
    if (!match) continue;
    const bannerKey = `banner${match[1]}`; // normalized name (e.g., banner3)

    console.log(`\nProcessing ${file} → ${bannerKey}`);

    // Remove old optimized files for this bannerKey
    await removeOldOptimizedFilesFor(bannerKey, outputDir);

    const webpUrls = [];
    const avifUrls = [];
    for (const w of sizes) {
      const webpOut = path.join(outputDir, `${bannerKey}-${w}.webp`);
      const avifOut = path.join(outputDir, `${bannerKey}-${w}.avif`);

      try {
        await sharp(filePath)
          .resize({ width: w })
          .webp({ quality: qualityWebp })
          .toFile(webpOut);
        await sharp(filePath)
          .resize({ width: w })
          .avif({ quality: qualityAvif })
          .toFile(avifOut);
        process.stdout.write(".");
        webpUrls.push(publicUrlFor(webpOut));
        avifUrls.push(publicUrlFor(avifOut));
      } catch (err) {
        console.warn(
          `\n  failed to generate ${w}px for ${file}: ${err.message}`
        );
        continue;
      }
    }

    // generate small blur placeholder (webp base64)
    let placeholder = null;
    try {
      const buf = await sharp(filePath)
        .resize(placeholderSize)
        .webp({ quality: 30 })
        .toBuffer();
      placeholder = `data:image/webp;base64,${buf.toString("base64")}`;
      console.log(`\nplaceholder for ${bannerKey} generated`);
    } catch (err) {
      console.warn(
        `\n  failed to generate placeholder for ${file}: ${err.message}`
      );
    }

    // prepare manifest entry
    manifest[bannerKey] = {
      original: file, // original input filename
      variants: {
        avif: avifUrls,
        webp: webpUrls,
      },
      // fallback: prefer largest webp if available, else the original image path
      fallback: webpUrls.length
        ? webpUrls[webpUrls.length - 1]
        : `/${path.relative(publicDir, filePath).replace(/\\/g, "/")}`,
      placeholder: placeholder,
      alt: "", // leave blank so editors can fill later if needed
    };

    // small newline after progress dots
    process.stdout.write("\n");
  }

  // write manifest
  try {
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`\n✔ Manifest written: ${manifestPath}`);
  } catch (err) {
    console.error("Failed to write manifest:", err.message);
  }

  console.log(`\nDone. Optimized ${Object.keys(manifest).length} banner(s).`);
}

optimize().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
