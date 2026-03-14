// src/components/DealsSection.jsx
import { useState, useEffect } from "react";
import CouponReveal from "./couponReveal.jsx";

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-xl h-32"
      style={{ background: "#2a2a2a" }}
    />
  );
}

/** @param {{ apiUrl: string }} props */
export default function DealsSection({ apiUrl }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/coupons?mode=homepage&limit=6&status=active`)
      .then((r) => r.json())
      .then((d) => setCoupons(d.data || []))
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-heading mb-0">Today's Top Deals & Coupons</h2>
        <a href="/coupons" className="btn btn-outline--light text-sm">
          Explore more →
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : coupons.length === 0 ? (
          <p className="col-span-2 text-sm" style={{ color: "#707068" }}>
            No coupons available right now. Check back soon.
          </p>
        ) : (
          coupons.map((c) => (
            <div key={c.id}>
              <CouponReveal
                coupon={c}
                storeSlug={c.merchant?.slug || c.merchant_name}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
