// src/components/islands/RevealButton.jsx
import { useState, useRef } from "react";

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

function Toast({ message }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        background: "#89E900",
        color: "#181818",
        fontWeight: 600,
        fontSize: "0.875rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "0.375rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        zIndex: 50,
      }}
    >
      {message}
    </div>
  );
}

/**
 * RevealButton
 * @param {{
 *   offerId: string|number,
 *   couponType: string,
 *   storeSlug: string,
 *   merchant: { affl_url?: string, web_url?: string } | null
 * }} props
 */
export default function RevealButton({
  offerId,
  couponType,
  storeSlug,
  merchant = null,
}) {
  const [state, setState] = useState("idle"); // idle | loading | code | deal | error
  const [code, setCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const pushToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const handleReveal = async () => {
    if (state !== "idle") return;
    setState("loading");

    try {
      const base = (import.meta.env.PUBLIC_API_BASE_URL || "").replace(
        /\/+$/,
        "",
      );
      const resp = await fetchWithRetry(
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
        2,
      );

      if (resp.status === 429) {
        pushToast("Too many requests. Try again later.");
        setState("idle");
        return;
      }

      let data = null;
      try {
        data = await resp.json();
      } catch (_) {}

      const serverCode = data?.code ?? null;
      const serverRedirect = data?.redirect_url ?? null;

      if (serverCode) {
        setCode(serverCode);
        setState("code");

        let didCopy = false;
        try {
          await navigator.clipboard.writeText(serverCode);
          didCopy = true;
          pushToast("Code copied!");
        } catch (_) {}
        setCopied(didCopy);
      } else {
        setState("deal");
      }

      // redirect
      if (serverRedirect) {
        setTimeout(
          () => window.open(serverRedirect, "_blank", "noopener,noreferrer"),
          100,
        );
      } else if (!serverCode) {
        const fallback = merchant?.affl_url?.startsWith("http")
          ? merchant.affl_url
          : merchant?.web_url?.startsWith("http")
            ? merchant.web_url
            : null;
        if (fallback) {
          setTimeout(
            () => window.open(fallback, "_blank", "noopener,noreferrer"),
            100,
          );
        }
      }
    } catch (_) {
      pushToast("An error occurred. Try again.");
      setState("idle");
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      pushToast("Code copied!");
    } catch (_) {}
  };

  return (
    <>
      {state === "idle" || state === "loading" ? (
        <button
          type="button"
          onClick={handleReveal}
          disabled={state === "loading"}
          className="js-reveal-btn flex-shrink-0 inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold transition disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "#89E900", color: "#222222" }}
          onMouseOver={(e) => {
            if (state !== "loading")
              e.currentTarget.style.background = "#75C900";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "#89E900";
          }}
          aria-label={
            couponType === "coupon" ? "Reveal coupon code" : "Activate deal"
          }
        >
          {state === "loading" ? (
            <svg
              className="h-3.5 w-3.5 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : couponType === "coupon" ? (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          ) : (
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          )}
          {state === "loading"
            ? "Loading..."
            : couponType === "coupon"
              ? "Reveal Code"
              : "Activate Deal"}
        </button>
      ) : state === "code" ? (
        <div className="flex flex-col gap-1.5 w-full">
          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-md px-3 py-2 text-sm font-mono font-bold tracking-widest text-center border border-dashed overflow-x-auto cursor-pointer"
            style={{
              background: "#FFF0EB",
              borderColor: "#89E900",
              color: "#B93C10",
            }}
            title="Click to copy"
          >
            {code}
          </button>
          <div
            className="w-full rounded-md px-3 py-1.5 text-xs font-semibold text-center"
            style={
              copied
                ? {
                    background: "#f0fdf4",
                    color: "#15803d",
                    border: "1px solid #bbf7d0",
                  }
                : {
                    background: "#fffbeb",
                    color: "#92400e",
                    border: "1px solid #fcd34d",
                  }
            }
          >
            {copied
              ? "✓ Code copied to clipboard"
              : "⚠ Copy manually — clipboard blocked"}
          </div>
        </div>
      ) : state === "deal" ? (
        <div
          className="w-full rounded-md px-3 py-2 text-sm font-semibold text-center"
          style={{
            background: "#f0fdf4",
            color: "#15803d",
            border: "1px solid #bbf7d0",
          }}
        >
          ✓ Deal Activated
        </div>
      ) : null}

      {toast && <Toast message={toast} />}
    </>
  );
}
