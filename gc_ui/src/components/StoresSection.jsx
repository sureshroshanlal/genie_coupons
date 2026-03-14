// src/components/StoresSection.jsx
import { useState, useEffect } from "react";

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-xl h-36"
      style={{ background: "#2a2a2a" }}
    />
  );
}

/** @param {{ apiUrl: string }} props */
export default function StoresSection({ apiUrl }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/stores?mode=homepage&limit=8`)
      .then((r) => r.json())
      .then((d) => setStores(d.data || []))
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-heading mb-0">Top Stores</h2>
        <a href="/stores" className="btn btn-outline--light text-sm">
          All stores →
        </a>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : stores.map((store) => (
              <a
                key={store.id}
                href={`https://${store.slug}.geniecoupon.com`}
                className="store-card-home"
              >
                <div className="store-card-home-logo">
                  {store.logo_url ? (
                    <img
                      src={store.logo_url}
                      alt={store.name}
                      className="w-full h-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      className="text-xl font-bold"
                      style={{ color: "#707068" }}
                    >
                      {store.name?.charAt(0)}
                    </span>
                  )}
                </div>
                <h3 className="store-card-home-name">{store.name}</h3>
                <span className="store-card-home-count">
                  {store.stats?.active_coupons > 0
                    ? `${store.stats.active_coupons} coupons`
                    : "View deals"}
                </span>
              </a>
            ))}
      </div>
    </section>
  );
}
