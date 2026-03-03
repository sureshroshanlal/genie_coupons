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
  const [selectedLetter, setSelectedLetter] = useState("0-9"); // Default to 0-9
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);

  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Fetch stores from API
  const fetchStores = async (letter, currentCursor = null, append = false) => {
    try {
      setError(null);

      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const limit = currentCursor === null ? INITIAL_LOAD : LOAD_MORE;

      // // Build URL with proper parameters
      let url = `${apiUrl}/stores?limit=${limit}&letter=${encodeURIComponent(letter)}`;
      if (categorySlug) url += `&category=${encodeURIComponent(categorySlug)}`; // ADD THIS
      if (currentCursor) url += `&cursor=${encodeURIComponent(currentCursor)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!data || !Array.isArray(data.data)) {
        throw new Error("Invalid API response format");
      }

      const newStores = data.data;
      const totalCount = data.meta?.total || 0;
      const nextCursor = data.meta?.nextCursor || null;

      if (append) {
        setStores((prev) => [...prev, ...newStores]);
      } else {
        setStores(newStores);
      }

      setTotal(totalCount);
      setHasMore(!!nextCursor);
      setCursor(nextCursor);
    } catch (err) {
      console.error("Error fetching stores:", err);
      setError(err.message);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Handle letter change
  const handleLetterChange = (letter) => {
    if (letter === selectedLetter) return;

    setSelectedLetter(letter);
    setCursor(null);
    setHasMore(true);
    setStores([]);
    fetchStores(letter, null, false);
  };

  // Load more stores (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && cursor) {
      fetchStores(selectedLetter, cursor, true);
    }
  }, [loadingMore, hasMore, selectedLetter, cursor]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      },
    );

    observer.observe(loadMoreRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  // Initial load with 0-9
  useEffect(() => {
    fetchStores("0-9", null, false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Alphabet Filter Pills - Sticky */}
      <div className="sticky top-0 z-10 bg-white py-4 mb-6 border-b shadow-sm">
        <div className="flex flex-wrap gap-3 justify-center">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              disabled={loading && selectedLetter !== letter}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedLetter === letter
                  ? "bg-brand-primary text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Store Count */}
      <div className="mb-4 text-sm text-gray-600">
        {loading ? (
          <span>Loading stores...</span>
        ) : error ? (
          <span className="text-red-600">Error: {error}</span>
        ) : (
          <span>
            Showing {stores.length} of {total} stores starting with "
            {selectedLetter}"
          </span>
        )}
      </div>

      {/* Stores Grid - 6 columns on large screens, 5 on medium */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-40"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 text-lg mb-4">Failed to load stores</p>
          <button
            onClick={() => fetchStores(selectedLetter, null, false)}
            className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : stores.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {stores.map((store) => (
              <a
                key={store.id}
                href={`/stores/${store.slug}`}
                className="group block rounded-lg bg-white border border-gray-200 p-3 transition-all hover:shadow-lg hover:border-brand-primary"
              >
                {/* Logo - Smaller aspect ratio */}
                <div className="aspect-square mb-2 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="max-w-full max-h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-2xl font-bold text-gray-300">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Store Name - Smaller text */}
                <h3 className="text-xs font-semibold text-gray-900 text-center mb-1 group-hover:text-brand-primary transition-colors line-clamp-2">
                  {store.name}
                </h3>

                {/* Offer Count - Smaller text */}
                {store.stats?.active_coupons !== undefined && (
                  <p className="text-[10px] text-gray-500 text-center">
                    {store.stats.active_coupons}{" "}
                    {store.stats.active_coupons === 1 ? "offer" : "offers"}
                  </p>
                )}
              </a>
            ))}
          </div>

          {/* Infinite Scroll Trigger */}
          {hasMore && (
            <div ref={loadMoreRef} className="mt-8 flex justify-center py-8">
              {loadingMore ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <div className="w-5 h-5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading more stores...</span>
                </div>
              ) : (
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark transition-colors"
                >
                  Load More
                </button>
              )}
            </div>
          )}

          {/* End Message */}
          {!hasMore && stores.length > 0 && (
            <div className="mt-8 text-center text-gray-500 py-4">
              <p>You've reached the end of the list</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No stores found starting with "{selectedLetter}"
          </p>
        </div>
      )}
    </div>
  );
}
