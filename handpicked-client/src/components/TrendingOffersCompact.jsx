import React, { useState, useRef } from "react";

/**
 * TrendingOffersCompact.jsx - polished drop-in replacement
 *
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

function CompactToast({ message, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div role="status" aria-live="polite" className="toast">
      {message}
    </div>
  );
}

export default function TrendingOffersCompact({ offers, storeSlug }) {
  const items = Array.isArray(offers) ? offers.slice(0, 3) : [];
  const sSlug = storeSlug ?? null;
  const [stateMap, setStateMap] = useState(() => ({})); // { [id]: { loading, revealedCode, disabled } }
  const [toasts, setToasts] = useState([]);
  const mountedRef = useRef(true);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const setItemState = (id, patch) => {
    setStateMap((m) => ({
      ...(m || {}),
      [id]: { ...(m[id] || {}), ...patch },
    }));
  };

  const fallbackRedirect = (offer) => {
    const m = offer?.merchant || {};
    if (
      m.aff_url &&
      (m.aff_url.startsWith("http://") || m.aff_url.startsWith("https://"))
    )
      return m.aff_url;
    if (
      m.web_url &&
      (m.web_url.startsWith("http://") || m.web_url.startsWith("https://"))
    )
      return m.web_url;
    return null;
  };

  const handleClick = async (offer) => {
    const id = offer.id;
    const s = stateMap[id] || {};
    if (s.loading || s.disabled) return;

    setItemState(id, { loading: true });
    try {
      const base = import.meta.env.PUBLIC_API_BASE_URL || "";
      const endpoint =
        (base || "").replace(/\/+$/, "") +
        `/offers/${encodeURIComponent(String(id))}/click`;

      const resp = await fetchWithRetry(
        endpoint,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            store_slug: sSlug,
            referrer: "trending_sidebar",
            platform: "web",
          }),
        },
        2
      );

      if (resp.status === 429) {
        pushToast("Too many requests — try again later");
        setItemState(id, { loading: false });
        return;
      }
      if (!resp.ok) {
        pushToast("Failed to open offer — try again");
        setItemState(id, { loading: false });
        return;
      }

      const data = await resp.json().catch(() => ({}));
      const serverCode = data?.code || null;
      const serverRedirect = data?.redirect_url || null;

      if (serverCode) {
        // reveal inline (small) and copy
        setItemState(id, { revealedCode: serverCode });
        try {
          await navigator.clipboard.writeText(serverCode);
          pushToast("Code copied — opening store");
        } catch (e) {
          pushToast("Code revealed — opening store");
        }
      } else {
        pushToast("Opening store");
      }

      const redirectTo = serverRedirect || fallbackRedirect(offer);
      if (redirectTo) {
        try {
          window.open(redirectTo, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.warn("Failed to open redirect", e);
        }
      } else {
        pushToast("Merchant URL not available");
      }

      // disable after reveal to prevent duplicates
      setItemState(id, { disabled: true, loading: false });
    } catch (err) {
      console.error("TrendingOffersCompact click error:", err);
      pushToast("An error occurred");
      setItemState(id, { loading: false });
    }
  };

  return (
    <>
      <aside className="card-base p-4">
        <h3 className="section-heading mb-3">Trending offers</h3>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">No trending offers right now.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((o) => {
              const s = stateMap[o.id] || {};
              return (
                <li
                  key={o.id}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {o.title || "Offer"}
                    </div>

                    {/* <div className="text-xs text-gray-500 mt-0.5">
                      {o.type ? `${o.type} • ` : ""}
                      {o.click_count !== undefined
                        ? `${o.click_count} clicks`
                        : ""}
                    </div> */}

                    {s.revealedCode && (
                      <div
                        className="mt-2 text-xs font-mono text-blue-700 bg-blue-50 inline-block px-2 py-1 rounded"
                        role="status"
                        aria-live="polite"
                      >
                        {s.revealedCode}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleClick(o)}
                      disabled={s.loading || s.disabled}
                      className="text-xs px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-60"
                      aria-label={
                        o.coupon_type === "coupon"
                          ? "Reveal code and open store"
                          : "Activate deal"
                      }
                    >
                      {s.loading
                        ? "..."
                        : o.coupon_type === "coupon"
                        ? "Get code"
                        : "Activate"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      {toasts.map((t) => (
        <CompactToast
          key={t.id}
          message={t.message}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </>
  );
}
