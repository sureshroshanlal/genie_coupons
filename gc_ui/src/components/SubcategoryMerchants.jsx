import { useState, useEffect, useRef, useCallback } from "react";

export default function SubcategoryMerchants({
  apiUrl,
  parentSlug,
  subSlug,
  initialData,
}) {
  const [merchants, setMerchants] = useState(initialData?.merchants || []);
  const [nextCursor, setNextCursor] = useState(
    initialData?.pagination?.nextCursor || null,
  );
  const [hasMore, setHasMore] = useState(
    initialData?.pagination?.hasMore ?? false,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    try {
      setLoading(true);
      setError(null);
      const url = `${apiUrl}/categories/${parentSlug}/${subSlug}?limit=20${nextCursor ? `&cursor=${nextCursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const { merchants: newMerchants, pagination } = data.data;
      setMerchants((prev) => [...prev, ...newMerchants]);
      setNextCursor(pagination.nextCursor);
      setHasMore(pagination.hasMore);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextCursor, apiUrl, parentSlug, subSlug]);

  // IntersectionObserver to trigger load when sentinel is visible
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchMore();
      },
      { threshold: 0.1 },
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [fetchMore]);

  if (merchants.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          No stores found in this category
        </p>
        <a
          href="/categories"
          className="mt-4 inline-block px-6 py-2 bg-brand-primary text-white rounded-lg"
        >
          Browse All Categories
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {merchants.map((merchant) => (
          <a
            key={merchant.id}
            href={`/stores/${merchant.slug}?ref=category&parent=${parentSlug}&sub=${subSlug}`}
            className="group bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-brand-primary transition-all"
          >
            <div className="aspect-square mb-3 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
              {merchant.logo_url ? (
                <img
                  src={merchant.logo_url}
                  alt={merchant.name}
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <span className="text-3xl font-bold text-gray-400">
                    {merchant.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-900 text-center mb-2 group-hover:text-brand-primary line-clamp-2 min-h-[2.5rem]">
              {merchant.name}
            </h3>
            <div className="text-xs text-center">
              {merchant.active_coupons_count > 0 ? (
                <span className="inline-block px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                  {merchant.active_coupons_count}{" "}
                  {merchant.active_coupons_count === 1 ? "coupon" : "coupons"}
                </span>
              ) : (
                <span className="text-gray-400">No active coupons</span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-10 mt-4" />

      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-red-600 mb-2">Failed to load more stores</p>
          <button
            onClick={fetchMore}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {!hasMore && merchants.length > 0 && (
        <p className="text-center text-sm text-gray-400 py-6">
          All {merchants.length} stores loaded
        </p>
      )}
    </div>
  );
}
