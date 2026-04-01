// src/components/CategoriesSection.jsx
import { useState, useEffect } from "react";
import { cdnUrl } from '../utils/cdnUrl.js';

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-xl h-28"
      style={{ background: "#2a2a2a" }}
    />
  );
}

/** @param {{ apiUrl: string }} props */
export default function CategoriesSection({ apiUrl }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/categories?show_home=true&limit=8`)
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-heading mb-0">Popular Categories</h2>
        <a href="/categories" className="btn btn-outline--light text-sm">
          All categories →
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : categories.map((cat) => (
              <a
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="category-card-home"
              >
                <div className="category-card-home-icon">
                  {cat.thumb_url ? (
                    <img
                      src={cdnUrl(cat.thumb_url)}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-2xl">📦</span>
                  )}
                </div>
                <h3 className="category-card-home-name">{cat.name}</h3>
                {cat.stats?.subcategories > 0 && (
                  <p className="category-card-home-sub">
                    {cat.stats.subcategories} subcategories
                  </p>
                )}
              </a>
            ))}
      </div>
    </section>
  );
}
