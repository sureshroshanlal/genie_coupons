// scripts/fetch-home.js
import "dotenv/config";
import fs from "fs";
import fetch from "node-fetch";

const OUT_DIR = "public/_data";
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// Read and normalize backend
let BACKEND = process.env.PUBLIC_API_BASE_URL;
if (!BACKEND) {
  console.error(
    "❌ Missing PUBLIC_API_BASE_URL env. Set it in .env or Vercel settings."
  );
  process.exit(1);
}
// trim whitespace and trailing commas (defensive)
BACKEND = BACKEND.trim().replace(/,+$/, "");
console.log("Using PUBLIC_API_BASE_URL =", BACKEND);

async function fetchAndWrite(path, outFile) {
  try {
    // ensure path is a proper relative path
    const base = BACKEND.endsWith("/") ? BACKEND : `${BACKEND}/`;
    const rel = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(rel, base).toString();
    console.log("Fetching:", url);
    const res = await fetch(url, { timeout: 8000 });
    if (!res.ok) {
      console.error("Upstream non-200 for", url, res.status);
      fs.writeFileSync(
        outFile,
        JSON.stringify({ data: [], meta: {}, errorStatus: res.status })
      );
      return;
    }
    const json = await res.json();
    fs.writeFileSync(outFile, JSON.stringify(json));
    console.log(`✅ Wrote ${outFile}`);
  } catch (err) {
    console.error("Fetch error for", path, err?.message);
    fs.writeFileSync(
      outFile,
      JSON.stringify({ data: [], meta: {}, error: "fetch_failed" })
    );
  }
}

(async () => {
  await Promise.all([
    fetchAndWrite("/stores?limit=8&mode=homepage", `${OUT_DIR}/home.json`),
    fetchAndWrite("/coupons?limit=8&mode=homepage", `${OUT_DIR}/coupons.json`),
  ]);
})();
