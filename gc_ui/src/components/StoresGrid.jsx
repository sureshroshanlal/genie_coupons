// src/components/StoresGrid.jsx
import { useState, useEffect, useRef, useCallback } from "react";

const ALPHABET = [
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

export default function StoresGrid({ apiUrl, categorySlug }) {
  const [stores, setStores] = useState([]);
  const [selectedLetter, setSelectedLetter] = useState("0-9");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  const fetchStores = async (letter, currentCursor = null, append = false) => {
    try {
      setError(null);
      append ? setLoadingMore(true) : setLoading(true);
      const limit = currentCursor === null ? INITIAL_LOAD : LOAD_MORE;
      let url = `${apiUrl}/stores?limit=${limit}&letter=${encodeURIComponent(letter)}`;
      if (categorySlug) url += `&category=${encodeURIComponent(categorySlug)}`;
      if (currentCursor) url += `&cursor=${encodeURIComponent(currentCursor)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      if (!data || !Array.isArray(data.data))
        throw new Error("Invalid API response");
      append
        ? setStores((prev) => [...prev, ...data.data])
        : setStores(data.data);
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
    fetchStores("0-9", null, false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Alphabet filter — sticky */}
      <div
        className="sticky top-14 z-10 py-3 mb-6"
        style={{
          background: "var(--bg-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex flex-wrap gap-1.5 justify-center">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              disabled={loading && selectedLetter !== letter}
              className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
              style={
                selectedLetter === letter
                  ? {
                      background: "#89E900",
                      color: "#181818",
                      border: "1px solid #89E900",
                    }
                  : {
                      background: "var(--bg-subtle)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-default)",
                    }
              }
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <div className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
        {loading ? (
          "Loading stores…"
        ) : error ? (
          <span style={{ color: "#f87171" }}>Error: {error}</span>
        ) : (
          `Showing ${stores.length} of ${total} stores starting with "${selectedLetter}"`
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-lg h-36"
              style={{ background: "var(--bg-subtle)" }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="mb-4" style={{ color: "#f87171" }}>
            Failed to load stores
          </p>
          <button
            onClick={() => fetchStores(selectedLetter, null, false)}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      ) : stores.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {stores.map((store) => (
              <a
                key={store.id}
                href={`https://${store.slug}.geniecoupon.com`}
                className="group block rounded-lg p-3 transition-all"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "rgba(137,233,0,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 16px rgba(137,233,0,0.08)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div
                  className="aspect-square mb-2 flex items-center justify-center rounded-lg overflow-hidden"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="max-w-full max-h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="text-2xl font-bold"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h3
                  className="text-xs font-semibold text-center mb-1 line-clamp-2 transition-colors"
                  style={{ color: "var(--text-primary)" }}
                >
                  {store.name}
                </h3>
                {store.stats?.active_coupons !== undefined && (
                  <p
                    className="text-[10px] text-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {store.stats.active_coupons}{" "}
                    {store.stats.active_coupons === 1 ? "offer" : "offers"}
                  </p>
                )}
              </a>
            ))}
          </div>

          {hasMore && (
            <div ref={loadMoreRef} className="mt-8 flex justify-center py-8">
              {loadingMore && (
                <div
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <div
                    className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                    style={{
                      borderColor: "#89E900",
                      borderTopColor: "transparent",
                    }}
                  />
                  Loading more stores…
                </div>
              )}
            </div>
          )}

          {!hasMore && stores.length > 0 && (
            <div
              className="mt-8 text-center py-4 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              You've seen all {total} stores
            </div>
          )}
        </>
      ) : (
        <div
          className="text-center py-12 text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No stores found starting with "{selectedLetter}"
        </div>
      )}
    </div>
  );
}
