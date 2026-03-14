// src/components/islands/CouponFilterTabs.jsx
import { useState, useEffect, useRef } from "react";
import { renderCouponCardHtml } from "../../lib/renderers/couponCardHtml.js";

const TABS = [
  { key: "all", label: "All" },
  { key: "coupon", label: "Coupons" },
  { key: "deal", label: "Deals" },
  { key: "editor", label: "Editor Picks" },
];

// ── Inline CouponCard (mirrors CouponReveal logic without the full island overhead) ──
function CouponCard({ coupon, storeSlug }) {
  const containerRef = useRef(null);
  const revealedRef = useRef(new Map());
  const [disabledIds, setDisabledIds] = useState(new Set());

  const pushToast = (msg) => {
    // lightweight inline toast
    const el = document.createElement("div");
    el.className =
      "fixed bottom-6 right-6 text-sm px-3 py-2 rounded shadow z-50";
    el.style.cssText = "background:#89E900; color:#181818; font-weight:600;";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  const handleReveal = async (btn, offerId) => {
    if (!btn || !offerId || disabledIds.has(String(offerId))) return;
    btn.disabled = true;
    try {
      const base = (import.meta.env.PUBLIC_API_BASE_URL || "").replace(
        /\/+$/,
        "",
      );
      const resp = await fetch(
        `${base}/offers/${encodeURIComponent(String(offerId))}/click`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_slug: storeSlug,
            referrer: "site",
            platform: "web",
          }),
        },
      );
      if (resp.status === 429) {
        pushToast("Too many requests. Try again later.");
        btn.disabled = false;
        return;
      }

      let data = null;
      try {
        data = await resp.json();
      } catch (_) {}

      const code =
        data?.code ?? (coupon.code ? String(coupon.code).trim() : null);
      const redirect = data?.redirect_url ?? null;

      if (code) {
        revealedRef.current.set(String(offerId), code);
        const wrapper = document.createElement("div");
        wrapper.className = "flex flex-col gap-1.5";
        const box = document.createElement("div");
        box.className =
          "w-full rounded-md px-3 py-2 text-sm font-mono font-bold tracking-widest text-center border border-dashed overflow-x-auto";
        box.style.cssText =
          "background:#FFF0EB; border-color:#89E900; color:#B93C10;";
        box.textContent = code;
        wrapper.appendChild(box);

        let copied = false;
        try {
          await navigator.clipboard.writeText(code);
          copied = true;
        } catch (_) {}
        const banner = document.createElement("div");
        banner.className =
          "w-full rounded-md px-3 py-1.5 text-xs font-semibold text-center";
        if (copied) {
          banner.style.cssText =
            "background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;";
          banner.textContent = "✓ Code copied to clipboard";
          pushToast("Code copied!");
        } else {
          banner.style.cssText =
            "background:#fffbeb; color:#92400e; border:1px solid #fcd34d;";
          banner.textContent = "⚠ Copy manually — clipboard blocked";
        }
        wrapper.appendChild(banner);
        btn.replaceWith(wrapper);
      } else {
        const box = document.createElement("div");
        box.className =
          "w-full rounded-md px-3 py-2 text-sm font-semibold text-center";
        box.style.cssText =
          "background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;";
        box.textContent = "✓ Deal Activated";
        btn.replaceWith(box);
      }

      if (redirect)
        setTimeout(
          () => window.open(redirect, "_blank", "noopener,noreferrer"),
          100,
        );
      setDisabledIds((prev) => new Set(prev).add(String(offerId)));
    } catch (_) {
      pushToast("An error occurred. Try again.");
      btn.disabled = false;
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = renderCouponCardHtml(coupon);

    // Restore revealed state
    if (disabledIds.has(String(coupon.id))) {
      const btn = el.querySelector(
        `.js-reveal-btn[data-offer-id="${String(coupon.id)}"]`,
      );
      if (btn) {
        const code = revealedRef.current.get(String(coupon.id));
        if (code) {
          const wrapper = document.createElement("div");
          const box = document.createElement("div");
          box.className =
            "w-full rounded-md px-3 py-2 text-sm font-mono font-bold tracking-widest text-center border border-dashed";
          box.style.cssText =
            "background:#FFF0EB; border-color:#89E900; color:#B93C10;";
          box.textContent = code;
          wrapper.appendChild(box);
          btn.replaceWith(wrapper);
        } else {
          btn.disabled = true;
          btn.textContent = "Revealed";
        }
      }
    }

    const buttons = el.querySelectorAll(".js-reveal-btn[data-offer-id]");
    buttons.forEach((btn) => {
      const offerId = btn.getAttribute("data-offer-id");
      if (!offerId || btn.__attached) return;
      btn.__attached = true;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handleReveal(btn, offerId);
      });
    });
  }, [coupon, disabledIds]);

  return <div ref={containerRef} />;
}

// ── Main Filter Tabs component ─────────────────────────────────────────────
export default function CouponFilterTabs({ coupons = [], storeSlug = "" }) {
  const [active, setActive] = useState("all");

  const filtered = coupons.filter((c) => {
    if (active === "all") return true;
    if (active === "editor") return !!c.is_editor;
    return (c.coupon_type || "") === active;
  });

  const counts = {
    all: coupons.length,
    coupon: coupons.filter((c) => c.coupon_type === "coupon").length,
    deal: coupons.filter((c) => c.coupon_type === "deal").length,
    editor: coupons.filter((c) => c.is_editor).length,
  };

  return (
    <section id="coupons">
      {/* Filter tabs */}
      <div
        className="flex items-center gap-2 flex-wrap mb-4"
        role="tablist"
        aria-label="Filter coupons"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          const count = counts[tab.key];
          if (count === 0 && tab.key !== "all") return null;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className="filter-tab"
              data-active={isActive ? "true" : "false"}
            >
              {tab.label}
              {count > 0 && <span className="filter-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Coupon cards */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3" role="tabpanel">
          {filtered.map((c) => (
            <div key={c.id} className="w-full card-base p-0">
              <CouponCard coupon={c} storeSlug={storeSlug} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "#707068" }}>
          No {active === "all" ? "" : active} coupons available.
        </p>
      )}
    </section>
  );
}
