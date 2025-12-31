// src/components/couponReveal.jsx
import React, { useEffect, useRef, useState } from "react";
import { renderCouponCardHtml } from "../lib/renderers/couponCardHtml.js";

/**
 * CouponReveal React island
 */

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

export default function CouponReveal({ coupon, storeSlug }) {
  const c = coupon || {};
  const sSlug = storeSlug || null;
  const containerRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const [disabledOfferIds, setDisabledOfferIds] = useState(new Set());
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

  // Core click handler extracted so we can attach it to buttons directly
  const handleRevealClick = async (btnEl, offerId) => {
    if (!btnEl || !offerId) return;
    if (disabledOfferIds.has(String(offerId))) return;

    // disable immediate to prevent double-taps
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
        2
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
        const box = document.createElement("div");
        box.className =
          "w-full rounded-md px-3 py-2 text-sm font-mono text-brand-primary bg-brand-primary/10 border border-dashed border-brand-accent overflow-x-auto";
        box.textContent = codeToReveal;
        btnEl.replaceWith(box);
        try {
          await navigator.clipboard.writeText(codeToReveal);
          pushToast("Code copied to clipboard");
        } catch (e) {
          pushToast("Code revealed — copy manually");
        }
      }

      if (serverRedirect) {
        // small delay to allow UI update & copy toast to appear
        setTimeout(() => {
          window.open(serverRedirect, "_blank", "noopener,noreferrer");
        }, 100);
      } else {
        const m = c?.merchant || {};
        const fallback = m.affl_url?.startsWith("http")
          ? m.affl_url
          : m.web_url?.startsWith("http")
          ? m.web_url
          : null;
        if (fallback && !codeToReveal) {
          setTimeout(() => {
            window.open(fallback, "_blank", "noopener,noreferrer");
          }, 100);
        }
      }

      // mark revealed in this session
      setDisabledOfferIds((prev) => new Set(prev).add(String(offerId)));
    } catch (err) {
      pushToast("An error occurred. Try again.");
      if (btnEl) btnEl.disabled = false;
    }
  };

  // Inject SSR-markup from renderCouponCardHtml into this island's container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.innerHTML = renderCouponCardHtml(c);
    // If this offer was revealed previously in this session, reflect that state
    if (disabledOfferIds.has(String(c.id))) {
      const btn = el.querySelector(
        `.js-reveal-btn[data-offer-id="${String(c.id)}"]`
      );
      if (btn) {
        const box = document.createElement("div");
        box.className =
          "w-full rounded-md px-3 py-2 text-sm font-mono text-brand-primary bg-brand-primary/10 border border-dashed border-brand-accent overflow-x-auto";
        box.textContent = "REVEALED";
        btn.replaceWith(box);
      }
    }

    // Attach direct click handlers to any reveal buttons found in the injected HTML.
    const buttons = el.querySelectorAll(".js-reveal-btn[data-offer-id]");
    if (buttons && buttons.length > 0) {
      buttons.forEach((btn) => {
        const offerId = btn.getAttribute("data-offer-id");
        if (!offerId) return;

        // avoid attaching multiple handlers: use a flag
        if (!btn.__coupon_reveal_attached) {
          btn.__coupon_reveal_attached = true;
          btn.addEventListener("click", (ev) => {
            ev.stopPropagation();
            handleRevealClick(btn, offerId);
          });
        }
      });
    }
  }, [c, disabledOfferIds]);

  // Keep delegated listener as a safety-net for elements added later dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const delegated = async (ev) => {
      const btn = ev.target.closest && ev.target.closest(".js-reveal-btn");
      if (!btn) return;
      const offerId = btn.getAttribute("data-offer-id");
      if (!offerId) return;
      // avoid running twice if direct handler already processed it
      if (btn.__coupon_reveal_attached_handled) return;
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
