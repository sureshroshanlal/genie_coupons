// src/components/TestimonialsCarousel.jsx
import { useState, useEffect, useRef } from "react";

function StarIcon({ filled }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? "text-yellow-400" : "text-gray-200"}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.447a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.372 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.642 9.377c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.95z" />
    </svg>
  );
}

/**
 * @param {{ items: any[], avgRating: number|null, totalReviews: number }} props
 */
export default function TestimonialsCarousel({
  items = [],
  avgRating,
  totalReviews,
}) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef(null);
  const displayItems = Array.isArray(items) ? items : [];
  const roundedAvg = typeof avgRating === "number" ? Math.round(avgRating) : 0;

  const next = () => setCurrent((c) => (c + 1) % displayItems.length);
  const prev = () =>
    setCurrent((c) => (c - 1 + displayItems.length) % displayItems.length);

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(next, 4000);
  };

  useEffect(() => {
    if (displayItems.length <= 1) return;
    intervalRef.current = setInterval(next, 4000);
    return () => clearInterval(intervalRef.current);
  }, [displayItems.length]);

  if (displayItems.length === 0) return null;

  const t = displayItems[current];

  return (
    <section
      className="card-base p-6 mt-10"
      aria-labelledby="testimonials-heading"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2
            id="testimonials-heading"
            className="text-2xl font-bold text-brand-secondary"
          >
            Customer Testimonials
          </h2>
          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <StarIcon key={i} filled={i < roundedAvg} />
              ))}
              <span className="ml-1">
                {typeof avgRating === "number" ? avgRating.toFixed(1) : "—"}
              </span>
            </div>
            <span className="text-gray-400">•</span>
            <span>{totalReviews || displayItems.length} reviews</span>
          </div>
        </div>
        <a href="#reviews" className="btn btn-outline text-sm">
          See all reviews
        </a>
      </div>

      <article className="border border-gray-100 rounded-xl p-5 bg-white min-h-[140px]">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
            {t.avatar_url ? (
              <img
                src={t.avatar_url}
                alt={t.user_name || "Reviewer"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-500">
                {(t.user_name || "A").charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-gray-900">
                {t.user_name || "Anonymous"}
              </p>
              {typeof t.rating === "number" && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} filled={i < Math.round(t.rating)} />
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{t.comment}</p>
          </div>
        </div>
      </article>

      {displayItems.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => {
              prev();
              resetTimer();
            }}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <div className="flex gap-1.5">
            {displayItems.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setCurrent(i);
                  resetTimer();
                }}
                className={`h-2 rounded-full transition-all ${i === current ? "bg-brand-primary w-4" : "bg-gray-300 w-2"}`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => {
              next();
              resetTimer();
            }}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            aria-label="Next"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
