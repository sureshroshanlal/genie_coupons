// src/lib/renderers/storeCardHtml.js
import { escapeHtml } from "./couponCardHtml.js";

// load manifest once (server-safe OR browser-safe)
let logoManifest = {};
try {
  if (typeof window === "undefined") {
    // Node / server / build-time → use fs
    const fs = await import("fs");
    const path = await import("path");
    const manifestPath = path.join(
      process.cwd(),
      "public/optimized/logos/manifest.json"
    );
    if (fs.existsSync(manifestPath)) {
      logoManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    }
  } else {
    // Browser — fetch manifest only when card(s) are near the viewport (best perf)
    let logoManifest = {};
    let manifestLoaded = false;

    const doFetchLogoManifest = async () => {
      if (manifestLoaded) return;
      manifestLoaded = true;
      try {
        const res = await fetch("/optimized/logos/manifest.json");
        if (res.ok) {
          logoManifest = await res.json();
          // If you need to notify other code that logos are available:
          // document.dispatchEvent(new CustomEvent('logoManifestLoaded', { detail: logoManifest }));
        }
      } catch (e) {
        console.warn("Logo manifest fetch failed:", e);
      }
    };

    // Choose a sensible selector that matches one of the card elements on the page.
    // Tweak ".coupon-card, .store-card" if your actual card markup uses a different class.
    const firstCard = document.querySelector(".coupon-card, .store-card");

    if (firstCard && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              obs.disconnect();
              doFetchLogoManifest();
              return;
            }
          }
        },
        { rootMargin: "300px" }
      ); // preload slightly before visible
      io.observe(firstCard);
      // Safety fallback: if IO doesn't trigger for some reason, also schedule idle callback
      if ("requestIdleCallback" in window) {
        requestIdleCallback(
          () => {
            if (!manifestLoaded) doFetchLogoManifest();
          },
          { timeout: 2000 }
        );
      } else {
        window.addEventListener(
          "load",
          () =>
            setTimeout(() => {
              if (!manifestLoaded) doFetchLogoManifest();
            }, 1200),
          { once: true }
        );
      }
    } else {
      // No IntersectionObserver → fallback to idle/load fetch
      if ("requestIdleCallback" in window) {
        requestIdleCallback(doFetchLogoManifest, { timeout: 2000 });
      } else {
        window.addEventListener(
          "load",
          () => setTimeout(doFetchLogoManifest, 1200),
          { once: true }
        );
      }
    }
  }
} catch (e) {
  console.warn("Logo manifest load failed:", e.message || e);
}

/**
 * renderStoreCardHtml(store)
 * store: { id, slug, name, logo_url, stats: { active_coupons } }
 */
export function renderStoreCardHtml(store = {}) {
  const slug = escapeHtml(store.slug ?? "");
  const name = escapeHtml(store.name ?? "");
  const logoUrl = store.logo_url ? String(store.logo_url) : "";

  // try manifest lookup by id first
  const idKey = String(store.id);
  const manifestEntry = logoManifest[idKey];

  const active =
    store.stats && typeof store.stats.active_coupons === "number"
      ? Number(store.stats.active_coupons)
      : null;

  // build logo HTML (non-breaking)
  let logoHtml = `<div class="w-full flex items-center justify-center text-xs text-gray-400">Logo</div>`;

  if (
    manifestEntry &&
    Array.isArray(manifestEntry.variants) &&
    manifestEntry.variants.length
  ) {
    const srcset = manifestEntry.variants
      .map((v) => `${v.src} ${v.width}w`)
      .join(", ");
    const middle = Math.floor(manifestEntry.variants.length / 2);
    const fallback = manifestEntry.variants[middle].src;
    const blur = manifestEntry.blurDataURL || "";

    logoHtml = `
      <img
        src="${escapeHtml(fallback)}"
        srcset="${escapeHtml(srcset)}"
        sizes="64px"
        alt="${name}"
        width="64"
        height="64"
        loading="lazy"
        decoding="async"
        class="max-h-full max-w-full object-contain"
        style="aspect-ratio:1/1; background-image: url('${escapeHtml(
          blur
        )}'); background-size: cover; background-position: center;"
      />`;
  } else if (logoUrl) {
    logoHtml = `<img src="${escapeHtml(
      logoUrl
    )}" alt="${name}" width="96" height="80" loading="lazy" decoding="async" class="max-h-full max-w-full object-contain" />`;
  }

  const anchorHtml = `
  <a
    href="/stores/${slug}"
    class="card-base block p-4 h-full hover:shadow-lg hover:-translate-y-0.5 transition-transform duration-150"
    aria-label="Open ${name}"
  >
    <div class="flex flex-col h-full">
      <div class="flex items-center justify-center h-16 mb-3 border-b border-gray-100 pb-3">
        ${logoHtml}
      </div>
      <div class="flex-1 flex flex-col justify-center text-center">
        <h3 class="font-semibold text-brand-primary text-sm md:text-base truncate">${name}</h3>
        ${
          active !== null
            ? `<div class="mt-2 flex justify-center"><span class="pill pill-green">${active} ${
                active === 1 ? "Offer" : "Offers"
              }</span></div>`
            : ""
        }
      </div>
    </div>
  </a>
`;

  // Wrap anchor in same outer wrapper used by stores/index.astro
  return `
  <div class="rounded-md bg-white/5 p-3 transition-shadow hover:shadow-store-card" style="border-top-width: 3px; border-top-style: solid; border-top-color: transparent;">
    ${anchorHtml}
  </div>
`;
}
