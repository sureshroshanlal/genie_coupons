// src/components/couponReveal.jsx
import React, { useEffect, useRef, useState } from "react";
import { renderCouponCardHtml } from "../lib/renderers/couponCardHtml.js";

async function fetchWithRetry(url, options, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await fetch(url, options);
      if (resp.ok || resp.status === 429) return resp;
    } catch (err) {
      if (i === retries) throw err;
    }
  }
  throw new Error("Fetch failed after retries");
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 bg-brand-dark text-white text-sm px-3 py-2 rounded shadow"
    >
      {message}
    </div>
  );
}

// ── Shared helper: replaces a button with the revealed code UI ──
function buildCodeBox(code) {
  const wrapper = document.createElement("div");
  wrapper.className = "flex flex-col gap-1.5";

  const box = document.createElement("div");
  box.className =
    "w-full rounded-md px-3 py-2 text-sm font-mono font-bold tracking-widest text-center border border-dashed overflow-x-auto";
  box.style.cssText =
    "background:#FFF0EB; border-color:#FF5A1F; color:#B93C10;";
  box.textContent = code;

  wrapper.appendChild(box);
  return { wrapper, box };
}

function buildCopyBanner(success) {
  const banner = document.createElement("div");
  banner.className =
    "w-full rounded-md px-3 py-1.5 text-xs font-semibold text-center";
  if (success) {
    banner.style.cssText =
      "background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;";
    banner.textContent = "✓ Code copied to clipboard";
  } else {
    banner.style.cssText =
      "background:#fffbeb; color:#92400e; border:1px solid #fcd34d;";
    banner.textContent = "⚠ Copy manually — clipboard blocked";
  }
  return banner;
}

function buildDealBox() {
  const box = document.createElement("div");
  box.className =
    "w-full rounded-md px-3 py-2 text-sm font-semibold text-center";
  box.style.cssText =
    "background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;";
  box.textContent = "✓ Deal Activated";
  return box;
}

export default function CouponReveal({ coupon, storeSlug }) {
  const c = coupon || {};
  const sSlug = storeSlug || null;
  const containerRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [disabledOfferIds, setDisabledOfferIds] = useState(new Set());
  const revealedCodesRef = useRef(new Map()); // offerId → actual code string
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => (mountedRef.current = false);
  }, []);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const handleRevealClick = async (btnEl, offerId) => {
    if (!btnEl || !offerId) return;
    if (disabledOfferIds.has(String(offerId))) return;

    btnEl.disabled = true;

    try {
      const base = import.meta.env.PUBLIC_API_BASE_URL || "";
      const endpoint =
        (base || "").replace(/\/+$/, "") +
        `/offers/${encodeURIComponent(String(offerId))}/click`;

      const resp = await fetchWithRetry(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_slug: sSlug,
            referrer: "site",
            platform: "web",
          }),
        },
        2,
      );

      if (resp.status === 429) {
        pushToast("Too many requests. Please try again later.");
        btnEl.disabled = false;
        return;
      }

      let data = null;
      try {
        data = await resp.json();
      } catch (_) {
        data = null;
      }

      const serverCode = data?.code ?? null;
      const serverRedirect = data?.redirect_url ?? null;
      const codeToReveal =
        serverCode ?? (c.code ? String(c.code).trim() : null);

      if (codeToReveal) {
        // ── Save code so session restore can show it ──
        revealedCodesRef.current.set(String(offerId), codeToReveal);

        // ── Show the actual code ──
        const { wrapper } = buildCodeBox(codeToReveal);

        let copied = false;
        try {
          await navigator.clipboard.writeText(codeToReveal);
          copied = true;
        } catch (_) {}

        wrapper.appendChild(buildCopyBanner(copied));
        btnEl.replaceWith(wrapper);
        if (copied) pushToast("Code copied to clipboard");
      } else {
        // ── Deal activation (no code) ──
        btnEl.replaceWith(buildDealBox());
      }

      // redirect
      if (serverRedirect) {
        setTimeout(
          () => window.open(serverRedirect, "_blank", "noopener,noreferrer"),
          100,
        );
      } else {
        const m = c?.merchant || {};
        const fallback = m.affl_url?.startsWith("http")
          ? m.affl_url
          : m.web_url?.startsWith("http")
            ? m.web_url
            : null;
        if (fallback && !codeToReveal) {
          setTimeout(
            () => window.open(fallback, "_blank", "noopener,noreferrer"),
            100,
          );
        }
      }

      setDisabledOfferIds((prev) => new Set(prev).add(String(offerId)));
    } catch (err) {
      pushToast("An error occurred. Try again.");
      if (btnEl) btnEl.disabled = false;
    }
  };

  // Inject SSR markup + attach handlers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = renderCouponCardHtml(c);

    // ── Restore previously revealed state in this session ──
    if (disabledOfferIds.has(String(c.id))) {
      const btn = el.querySelector(
        `.js-reveal-btn[data-offer-id="${String(c.id)}"]`,
      );
      if (btn) {
        const couponType = btn.getAttribute("data-coupon-type");
        if (couponType === "coupon") {
          // use the code we saved after the API call
          const code = revealedCodesRef.current.get(String(c.id)) || "";
          if (code) {
            const { wrapper } = buildCodeBox(code);
            btn.replaceWith(wrapper);
          } else {
            btn.disabled = true;
            btn.textContent = "Code Revealed";
          }
        } else {
          btn.replaceWith(buildDealBox());
        }
      }
    }

    // Attach direct click handlers
    const buttons = el.querySelectorAll(".js-reveal-btn[data-offer-id]");
    buttons.forEach((btn) => {
      const offerId = btn.getAttribute("data-offer-id");
      if (!offerId || btn.__coupon_reveal_attached) return;
      btn.__coupon_reveal_attached = true;
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        handleRevealClick(btn, offerId);
      });
    });
  }, [c, disabledOfferIds]);

  // Delegated listener as safety-net
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const delegated = async (ev) => {
      const btn = ev.target.closest?.(".js-reveal-btn");
      if (!btn) return;
      const offerId = btn.getAttribute("data-offer-id");
      if (!offerId || btn.__coupon_reveal_attached_handled) return;
      btn.__coupon_reveal_attached_handled = true;
      await handleRevealClick(btn, offerId);
    };

    el.addEventListener("click", delegated);
    return () => {
      try {
        el.removeEventListener("click", delegated);
      } catch (e) {}
    };
  }, [c, sSlug, disabledOfferIds]);

  return (
    <>
      <div ref={containerRef} />
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </>
  );
}
