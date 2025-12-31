// src/lib/renderers/couponCardHtml.js

// keep your existing escapeHtml
export function escapeHtml(s = "") {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

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

//   } else {
//     // Browser → fetch static JSON instead of fs
//     const res = await fetch("/optimized/logos/manifest.json");
//     if (res.ok) {
//       logoManifest = await res.json();
//     }
//   }

/**
 * renderCouponCardHtml(item)
 * item: {
 *   id, title, coupon_type, code, ends_at, merchant_id,
 *   merchant: { id, slug, name, logo_url }, merchant_name,
 *   click_count, description
 * }
 */
export function renderCouponCardHtml(item = {}) {
  const id = escapeHtml(item.id ?? "");
  const title = escapeHtml(item.title ?? "");
  const description = escapeHtml(item.description ?? "");
  const merchantName = escapeHtml(
    item.merchant_name ?? item.merchant?.name ?? ""
  );

  // determine logo URL or manifest lookup key
  const merchantIdKey =
    item.merchant_id !== undefined && item.merchant_id !== null
      ? String(item.merchant_id)
      : item.merchant &&
        item.merchant.id !== undefined &&
        item.merchant.id !== null
      ? String(item.merchant.id)
      : null;

  const logoUrl = item.merchant?.logo_url ? String(item.merchant.logo_url) : "";

  // attempt to get optimized manifest entry (only if merchantIdKey present)
  const manifestEntry = merchantIdKey ? logoManifest[merchantIdKey] : null;

  const couponType = item.coupon_type || "";
  const endsAt = item.ends_at
    ? escapeHtml(
        new Date(item.ends_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      )
    : "";

  const clickCount =
    Number.isFinite(Number(item.click_count)) && Number(item.click_count) > 0
      ? Number(item.click_count)
      : 0;

  // Build logo HTML (preserve original behavior if no manifest)
  let logoHtml = `
  <div class="w-[40px] h-[40px] flex items-center justify-center bg-gray-50 rounded overflow-hidden"
       style="min-width:40px;min-height:40px;" aria-hidden="true">
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" focusable="false" role="img" aria-hidden="true">
      <rect width="40" height="40" fill="#f8fafc"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="9" fill="#9ca3af">Logo</text>
    </svg>
  </div>
`;

  if (
    manifestEntry &&
    Array.isArray(manifestEntry.variants) &&
    manifestEntry.variants.length
  ) {
    const srcset = manifestEntry.variants
      .map((v) => `${v.src} ${v.width}w`)
      .join(", ");
    const middle = Math.floor(manifestEntry.variants.length / 2);
    const fallback = manifestEntry.variants[middle].src; // pick a medium size as fallback
    const blur = manifestEntry.blurDataURL || "";

    // wrapper reserves space and shows blurred background while image loads
    logoHtml = `
    <div class="w-[40px] h-[40px] rounded overflow-hidden flex items-center justify-center" 
         style="min-width:40px;min-height:40px; background-image: url('${escapeHtml(
           blur
         )}'); background-size: cover; background-position: center;">
      <img
        src="${escapeHtml(fallback)}"
        srcset="${escapeHtml(srcset)}"
        sizes="40px"
        alt="${escapeHtml(merchantName || "Store")}"
        width="40"
        height="40"
        class="object-contain block"
        loading="lazy"
        decoding="async"
        style="display:block;width:40px;height:40px;object-fit:contain;background:transparent;"
      />
    </div>`;
  } else if (logoUrl) {
    logoHtml = `
    <div class="w-[40px] h-[40px] rounded overflow-hidden flex items-center justify-center" 
         style="min-width:40px;min-height:40px;">
      <img src="${escapeHtml(logoUrl)}"
           alt="${escapeHtml(merchantName || "Store")}"
           width="40"
           height="40"
           class="object-contain block"
           loading="lazy"
           decoding="async"
           style="display:block;width:40px;height:40px;object-fit:contain;background:transparent;" />
    </div>`;
  }

  const badgesHtml = `
    <div class="w-full flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <img src="/images/verified-badge.webp" alt="Verified" class="h-4 w-4 sm:h-5 sm:w-5 object-contain" loading="lazy" decoding="async" />
        <span class="text-[12px] sm:text-sm text-emerald-700 font-medium">Verified</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[12px] sm:text-sm text-emerald-700 font-medium">Re-verified</span>
        <img src="/images/reverified-badge.webp" alt="Re-verified" class="h-4 w-4 sm:h-5 sm:w-5 object-contain" loading="lazy" decoding="async" />
      </div>
    </div>
  `;

  const usedByHtml = `
    <div class="flex items-center gap-2">
      <div class="flex items-center gap-2 text-[11px] sm:text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-1.13a4 4 0 10-8 0 4 4 0 008 0z" /></svg>
        <span>used by ${clickCount} ${
    clickCount === 1 ? "user" : "users"
  }</span>
      </div>
    </div>
  `;

  return `
    <div class="relative">
      <div class="card-base p-4 flex flex-col gap-3 min-h-[120px]">
        ${badgesHtml}

        <div class="flex items-center gap-3">
          <div class="w-10 h-10 flex items-center justify-center rounded overflow-hidden bg-white flex-shrink-0 border">
            ${logoHtml}
          </div>

          <div class="flex-1 min-w-0">
            <!-- TITLE: truncated in the flow; shows full on hover or focus -->
            <div
              class="relative group inline-block w-full"
              tabindex="0"
              aria-describedby="title-tip-${id}"
            >
              <h3 class="font-semibold text-sm text-brand-primary truncate block min-w-0">
                ${title}
              </h3>

              <!-- tooltip: invisible to pointer-events until visible to avoid covering text -->
              <div
                id="title-tip-${id}"
                role="tooltip"
                class="absolute left-0 top-full mt-2 z-50 max-w-[20rem] w-max p-2 rounded bg-black text-white text-sm leading-tight shadow-lg break-words transform scale-95 opacity-0 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:scale-100 group-focus:pointer-events-auto"
                aria-hidden="true"
              >
                ${title}
              </div>
            </div>

            <!-- DESCRIPTION: 2-line clamp fallback + hover/focus tooltip -->
            <div
              class="relative group mt-1 inline-block w-full"
              tabindex="0"
              aria-describedby="desc-tip-${id}"
            >
              <p class="text-xs text-gray-500 block min-w-0 overflow-hidden"
                 style="-webkit-box-orient: vertical; display: -webkit-box; -webkit-line-clamp: 2;">
                ${description}
              </p>

              <div
                id="desc-tip-${id}"
                role="tooltip"
                class="absolute left-0 top-full mt-2 z-50 max-w-[20rem] w-max p-2 rounded bg-black text-white text-sm leading-tight shadow-lg break-words transform scale-95 opacity-0 pointer-events-none transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-focus:opacity-100 group-focus:scale-100 group-focus:pointer-events-auto"
                aria-hidden="true"
              >
                ${description}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-1">
          <button
            type="button"
            class="js-reveal-btn w-full rounded-md px-3 py-2 text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
            data-offer-id="${id}"
            aria-label="${
              couponType === "coupon" ? "Reveal coupon code" : "Activate deal"
            }"
          >
            ${couponType === "coupon" ? "Reveal Code" : "Activate Deal"}
          </button>
        </div>

        <div class="flex items-center justify-between mt-2">
          <div class="text-xs text-gray-500">${endsAt}</div>
          ${usedByHtml}
        </div>
      </div>
    </div>
  `;
}
