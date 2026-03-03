// src/pages/api/cron/generate-sitemaps.js
import { exec } from "node:child_process";

export async function GET() {
  return new Promise((resolve) => {
    exec("node scripts/generate-sitemaps.js", (err, stdout, stderr) => {
      if (err) {
        resolve(new Response(stderr || err.message, { status: 500 }));
        return;
      }

      resolve(new Response("Sitemap generated", { status: 200 }));
    });
  });
}
