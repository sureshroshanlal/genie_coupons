// src/components/CategoriesGrid.jsx
import { useState, useEffect } from "react";

const S = {
  sidebar: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    borderRadius: "12px",
    overflow: "hidden",
  },
  sidebarHeader: {
    padding: "0.75rem 1rem",
    borderBottom: "1px solid var(--border-default)",
    background: "var(--bg-elevated)",
  },
  mobileDropdown: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    borderRadius: "10px",
    marginTop: "0.5rem",
    maxHeight: "320px",
    overflowY: "auto",
  },
};

export default function CategoriesGrid({ apiUrl }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubcats, setLoadingSubcats] = useState(false);
  const [error, setError] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${apiUrl}/categories?limit=100`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (!data?.data) throw new Error("Invalid response");
      setCategories(data.data);
      if (data.data.length > 0) {
        setSelectedCategory(data.data[0]);
        fetchSubcategories(data.data[0].slug);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubcategories = async (slug) => {
    try {
      setLoadingSubcats(true);
      const res = await fetch(`${apiUrl}/categories/${slug}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setSubcategories(data?.data?.subcategories || []);
    } catch {
      setSubcategories([]);
    } finally {
      setLoadingSubcats(false);
    }
  };

  const handleCategoryClick = (cat) => {
    setSelectedCategory(cat);
    setIsMobileMenuOpen(false);
    fetchSubcategories(cat.slug);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "#89E900", borderTopColor: "transparent" }}
        />
      </div>
    );

  if (error)
    return (
      <div className="text-center py-12">
        <p className="mb-4 text-sm" style={{ color: "#f87171" }}>
          Failed to load categories
        </p>
        <button onClick={fetchCategories} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
      {/* Mobile dropdown */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="w-full px-4 py-3 rounded-lg flex items-center justify-between text-left font-semibold text-sm"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
          }}
        >
          <span>{selectedCategory?.name || "Select Category"}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isMobileMenuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {isMobileMenuOpen && (
          <div style={S.mobileDropdown}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="w-full px-4 py-3 text-left text-sm flex items-center justify-between transition-colors"
                style={{
                  borderBottom: "1px solid var(--border-default)",
                  color:
                    selectedCategory?.id === cat.id
                      ? "#89E900"
                      : "var(--text-secondary)",
                  background:
                    selectedCategory?.id === cat.id
                      ? "rgba(137,233,0,0.08)"
                      : "transparent",
                  fontWeight: selectedCategory?.id === cat.id ? 600 : 400,
                }}
              >
                <span>{cat.name}</span>
                <span
                  style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                >
                  {cat.stats?.subcategories || 0}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block lg:w-60 flex-shrink-0">
        <div style={{ ...S.sidebar, position: "sticky", top: "5rem" }}>
          <div style={S.sidebarHeader}>
            <h2
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#89E900" }}
            >
              Categories
            </h2>
          </div>
          <nav style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {categories.map((cat) => {
              const isActive = selectedCategory?.id === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border-default)",
                    borderLeft: isActive
                      ? "3px solid #89E900"
                      : "3px solid transparent",
                    background: isActive
                      ? "rgba(137,233,0,0.06)"
                      : "transparent",
                    color: isActive ? "#89E900" : "var(--text-secondary)",
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <span>{cat.name}</span>
                  {cat.stats?.subcategories > 0 && (
                    <span
                      style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}
                    >
                      {cat.stats.subcategories}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Subcategories */}
      <main className="flex-1">
        {selectedCategory && (
          <div className="mb-6">
            <h2
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {selectedCategory.name}
            </h2>
            {selectedCategory.description && (
              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {selectedCategory.description}
              </p>
            )}
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {subcategories.length} subcategories ·{" "}
              {selectedCategory.stats?.stores || 0} stores
            </p>
          </div>
        )}

        {loadingSubcats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl h-36"
                style={{ background: "var(--bg-subtle)" }}
              />
            ))}
          </div>
        ) : subcategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subcategories.map((subcat) => (
              <a
                key={subcat.id}
                href={`/categories/${selectedCategory.slug}/${subcat.slug}`}
                className="group block rounded-xl p-4 transition-all"
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
        ) : (
          <div
            className="text-center py-12 text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            No subcategories available
          </div>
        )}
      </main>
    </div>
  );
}
