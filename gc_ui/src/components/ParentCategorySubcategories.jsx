// src/components/ParentCategorySubcategories.jsx
import { useState, useEffect } from "react";

export default function ParentCategorySubcategories({ apiUrl, categorySlug }) {
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/categories/${categorySlug}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        setSubcategories(data.data?.subcategories || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [categorySlug]);

  if (loading)
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl h-36"
            style={{ background: "var(--bg-subtle)" }}
          />
        ))}
      </div>
    );

  if (error)
    return (
      <div className="text-center py-12">
        <p className="mb-4 text-sm" style={{ color: "#f87171" }}>
          Failed to load subcategories
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );

  if (!subcategories.length)
    return (
      <p
        className="text-center py-12 text-sm"
        style={{ color: "var(--text-muted)" }}
      >
        No subcategories found.
      </p>
    );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {subcategories.map((subcat) => (
        <a
          key={subcat.id}
          href={`/categories/${categorySlug}/${subcat.slug}`}
          className="group block rounded-xl p-4 transition-all"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = "rgba(137,233,0,0.4)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(137,233,0,0.08)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = "var(--border-default)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div
            className="w-10 h-10 mb-3 rounded-lg flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(137,233,0,0.08)",
              border: "1px solid rgba(137,233,0,0.15)",
            }}
          >
            {subcat.thumb_url ? (
              <img
                src={subcat.thumb_url}
                alt={subcat.name}
                className="w-full h-full object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-xl">📦</span>
            )}
          </div>
          <h3
            className="text-sm font-semibold mb-1 line-clamp-2 transition-colors"
            style={{ color: "var(--text-primary)" }}
          >
            {subcat.name}
          </h3>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {subcat.merchant_count || 0}{" "}
            {subcat.merchant_count === 1 ? "store" : "stores"}
          </p>
        </a>
      ))}
    </div>
  );
}
