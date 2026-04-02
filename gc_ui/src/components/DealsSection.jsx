// src/components/DealsSection.jsx
import CouponReveal from "./couponReveal.jsx";

function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-xl h-32"
      style={{ background: "#2a2a2a" }}
    />
  );
}

/** @param {{ coupons: any[] }} props */
export default function DealsSection({ coupons = [] }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-5">
        <h2 className="section-heading mb-0">Today's Top Deals & Coupons</h2>
        <a href="/coupons" className="btn btn-outline--light text-sm">
          Explore more →
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {coupons.length === 0 ? (
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
