import { useState, useEffect } from "react";

export default function CategoriesGrid({ apiUrl }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSubcats, setLoadingSubcats] = useState(false);
  const [error, setError] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    if (selectedCategory?.id === cat.id) return;
    setSelectedCategory(cat);
    setMobileOpen(false);
    fetchSubcategories(cat.slug);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading)
    return (
      <div className="cats-loading">
        <div className="cats-spinner__ring" />
      </div>
    );

  if (error)
    return (
      <div className="cats-error">
        <p>Failed to load categories</p>
        <button onClick={fetchCategories} className="btn btn-primary">
          Try Again
        </button>
      </div>
    );

  return (
    <div className="cats-root">
      {/* ── Mobile category picker ── */}
      <div className="cats-mobile-picker">
        <button
          className="cats-mobile-trigger"
          onClick={() => setMobileOpen((o) => !o)}
          aria-expanded={mobileOpen}
        >
          <span>{selectedCategory?.name || "Select Category"}</span>
          <svg
            className={`cats-mobile-trigger__chevron ${mobileOpen ? "cats-mobile-trigger__chevron--open" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {mobileOpen && (
          <div className="cats-mobile-dropdown">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="cats-mobile-option"
                data-active={selectedCategory?.id === cat.id ? "true" : "false"}
              >
                <span>{cat.name}</span>
                {cat.stats?.subcategories > 0 && (
                  <span className="cats-mobile-option__count">
                    {cat.stats.subcategories}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Layout ── */}
      <div className="cats-layout">
        {/* ── Desktop sidebar ── */}
        <aside className="cats-sidebar">
          <div className="cats-sidebar__header">
            <span>All Categories</span>
            <span className="cats-sidebar__total">{categories.length}</span>
          </div>
          <nav className="cats-sidebar__nav">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat)}
                className="cats-sidebar__item"
                data-active={selectedCategory?.id === cat.id ? "true" : "false"}
              >
                <span className="cats-sidebar__item-name">{cat.name}</span>
                {cat.stats?.subcategories > 0 && (
                  <span className="cats-sidebar__item-count">
                    {cat.stats.subcategories}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main panel ── */}
        <main className="cats-main">
          {/* Section header */}
          {selectedCategory && (
            <div className="cats-section-header">
              <div className="cats-section-header__left">
                <h2 className="cats-section-header__title">
                  {selectedCategory.name}
                </h2>
                {selectedCategory.description && (
                  <p className="cats-section-header__desc">
                    {selectedCategory.description}
                  </p>
                )}
              </div>
              <div className="cats-section-header__meta">
                <span className="cats-meta-pill">
                  {subcategories.length} subcategories
                </span>
                {selectedCategory.stats?.stores > 0 && (
                  <span className="cats-meta-pill">
                    {selectedCategory.stats.stores} stores
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Subcategory grid */}
          {loadingSubcats ? (
            <div className="cats-subgrid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="cats-subcard cats-subcard--skeleton" />
              ))}
            </div>
          ) : subcategories.length > 0 ? (
            <div className="cats-subgrid">
              {subcategories.map((subcat) => (
                <a
                  key={subcat.id}
                  href={`/categories/${selectedCategory.slug}/${subcat.slug}`}
                  className="cats-subcard"
                >
                  {/* Icon */}
                  <div className="cats-subcard__icon">
                    {subcat.thumb_url ? (
                      <img
                        src={subcat.thumb_url}
                        alt={subcat.name}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="cats-subcard__icon-fallback">
                        {subcat.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <h3 className="cats-subcard__name">{subcat.name}</h3>
                  <p className="cats-subcard__count">
                    {subcat.merchant_count || 0}{" "}
                    {subcat.merchant_count === 1 ? "store" : "stores"}
                  </p>

                  {/* Hover arrow */}
                  <span className="cats-subcard__arrow">→</span>
                </a>
              ))}
            </div>
          ) : (
            <div className="cats-empty">No subcategories available</div>
          )}
        </main>
      </div>
    </div>
  );
}
