// src/components/SubcategoryMerchants.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { cdnUrl } from '../utils/cdnUrl.js';

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

  if (merchants.length === 0 && !loading)
    return (
      <div className="text-center py-12">
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
          No stores found in this category
        </p>
        <a href="/categories" className="btn btn-primary">
          Browse All Categories
        </a>
      </div>
    );

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {merchants.map((merchant) => (
          <a
            key={merchant.id}
            href={`/stores/${merchant.slug}?ref=category&parent=${parentSlug}&sub=${subSlug}`}
            className="group block rounded-xl p-3 transition-all"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-default)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "rgba(137,233,0,0.4)";
              e.currentTarget.style.boxShadow =
                "0 4px 16px rgba(137,233,0,0.08)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "none";
            }}
          >
            <div
              className="aspect-square mb-2 flex items-center justify-center rounded-lg overflow-hidden"
              style={{ background: "var(--bg-elevated)" }}
            >
              {merchant.logo_url ? (
                <img
                  src={cdnUrl(merchant.logo_url)}
                  alt={merchant.name}
                  className="w-full h-full object-contain p-2"
                  loading="lazy"
                />
              ) : (
                <span
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-muted)" }}
                >
                  {merchant.name.charAt(0)}
                </span>
              )}
            </div>
            <h3
              className="text-xs font-semibold text-center mb-1.5 line-clamp-2 transition-colors"
              style={{ color: "var(--text-primary)", minHeight: "2.5rem" }}
            >
              {merchant.name}
            </h3>
            <div className="text-center">
              {merchant.active_coupons_count > 0 ? (
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: "rgba(137,233,0,0.12)",
                    color: "#89E900",
                  }}
                >
                  {merchant.active_coupons_count}{" "}
                  {merchant.active_coupons_count === 1 ? "coupon" : "coupons"}
                </span>
              ) : (
                <span
                  className="text-[10px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  No active coupons
                </span>
              )}
            </div>
          </a>
        ))}
      </div>

      <div ref={sentinelRef} className="h-10 mt-4" />

      {loading && (
        <div className="flex justify-center py-6">
          <div
            className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: "#89E900", borderTopColor: "transparent" }}
          />
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <p className="text-sm mb-2" style={{ color: "#f87171" }}>
            Failed to load more stores
          </p>
          <button onClick={fetchMore} className="btn btn-primary text-sm">
            Retry
          </button>
        </div>
      )}

      {!hasMore && merchants.length > 0 && (
        <p
          className="text-center text-xs py-6"
          style={{ color: "var(--text-muted)" }}
        >
          All {merchants.length} stores loaded
        </p>
      )}
    </div>
  );
}
