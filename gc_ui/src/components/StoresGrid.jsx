import { useState, useEffect, useRef, useCallback } from "react";
import { cdnThumb } from '../utils/cdnUrl.js';

const ALPHABET = [
  "All",
  "0-9",
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];
const INITIAL_LOAD = 100;
const LOAD_MORE = 50;

// ── Store Card ────────────────────────────────────────────────────────────────
function StoreCard({ store }) {
  const offers = store.stats?.active_coupons ?? null;
  const initial = store.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <a
      href={`https://${store.slug}.geniecoupon.com`}
      className="store-grid-card"
    >
      {/* Offer badge */}
      {offers !== null && offers > 0 && (
        <span className="store-grid-card__badge">
          {offers} {offers === 1 ? "offer" : "offers"}
        </span>
      )}

      {/* Logo */}
      <div className="store-grid-card__logo">
        {store.logo_url ? (
          <img
            src={cdnThumb(store.logo_url, 96)}
            alt={store.name}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="store-grid-card__initial">{initial}</span>
        )}
      </div>

      {/* Name */}
      <p className="store-grid-card__name">{store.name}</p>

      {/* CTA line */}
      <span className="store-grid-card__cta">View deals →</span>
    </a>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="store-grid-card store-grid-card--skeleton"
      aria-hidden="true"
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function StoresGrid({ apiUrl, categorySlug, initialStores = [], initialCursor = null, initialTotal = 0 }) {
  const [stores, setStores] = useState(initialStores);
  const [selectedLetter, setSelectedLetter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [cursor, setCursor] = useState(initialCursor);
  const [total, setTotal] = useState(initialTotal);
  const [error, setError] = useState(null);
  const loadMoreRef = useRef(null);
  const observerRef = useRef(null);

  const fetchStores = async (letter, currentCursor = null, append = false) => {
    try {
      setError(null);
      append ? setLoadingMore(true) : setLoading(true);
      const limit = currentCursor === null ? INITIAL_LOAD : LOAD_MORE;
      let url = `${apiUrl}/stores?limit=${limit}&letter=${encodeURIComponent(letter)}`;
      if (categorySlug) url += `&category=${encodeURIComponent(categorySlug)}`;
      if (currentCursor) url += `&cursor=${encodeURIComponent(currentCursor)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      if (!data || !Array.isArray(data.data))
        throw new Error("Invalid API response");
      append ? setStores((p) => [...p, ...data.data]) : setStores(data.data);
      setTotal(data.meta?.total || 0);
      setHasMore(!!data.meta?.nextCursor);
      setCursor(data.meta?.nextCursor || null);
    } catch (err) {
      setError(err.message);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLetterChange = (letter) => {
    if (letter === selectedLetter) return;
    setSelectedLetter(letter);
    setCursor(null);
    setHasMore(true);
    setStores([]);
    fetchStores(letter, null, false);
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && cursor)
      fetchStores(selectedLetter, cursor, true);
  }, [loadingMore, hasMore, selectedLetter, cursor]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 0.1, rootMargin: "100px" },
    );
    observer.observe(loadMoreRef.current);
    observerRef.current = observer;
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  useEffect(() => {
    if (initialStores.length === 0)
      fetchStores("All", null, false);
  }, []);

  return (
    <div className="stores-grid-root">
      {/* ── Alphabet bar ── */}
      <div className="stores-alpha-bar">
        <div className="stores-alpha-inner">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              disabled={loading && selectedLetter !== letter}
              className="stores-alpha-btn"
              data-active={selectedLetter === letter ? "true" : "false"}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* ── Meta line ── */}
      <div className="stores-meta-line">
        {loading ? (
          <span>Loading stores…</span>
        ) : error ? (
          <span style={{ color: "#f87171" }}>Error: {error}</span>
        ) : (
          <>
            <span style={{ color: "var(--brand-primary)", fontWeight: 700 }}>
              {stores.length}
            </span>
            <span> of </span>
            <span style={{ color: "var(--text-secondary)" }}>
              {total} stores
            </span>
            {selectedLetter !== "All" && (
              <span style={{ color: "var(--text-muted)" }}>
                {" "}
                · "{selectedLetter}"
              </span>
            )}
          </>
        )}
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="stores-grid">
          {Array.from({ length: 24 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="stores-error">
          <p>Failed to load stores</p>
          <button
            onClick={() => fetchStores(selectedLetter, null, false)}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      ) : stores.length > 0 ? (
        <>
          <div className="stores-grid">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>

          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="stores-load-more">
            {loadingMore && (
              <div className="stores-spinner">
                <div className="stores-spinner__ring" />
                <span>Loading more…</span>
              </div>
            )}
          </div>

          {!hasMore && stores.length > 0 && (
            <div className="stores-end-label">All {total} stores loaded</div>
          )}
        </>
      ) : (
        <div className="stores-empty">
          No stores found
          {selectedLetter !== "All" ? ` starting with "${selectedLetter}"` : ""}
        </div>
      )}
    </div>
  );
}
