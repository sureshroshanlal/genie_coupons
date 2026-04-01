// src/components/TestimonialsCarousel.jsx
import { useState, useEffect, useRef } from "react";
import { cdnUrl } from '../utils/cdnUrl.js';

function Stars({ rating }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5"
          viewBox="0 0 20 20"
          fill={i < Math.round(rating) ? "#fbbf24" : "#333333"}
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.447a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.372 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.642 9.377c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.95z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ t }) {
  return (
    <article className="testimonial-card">
      <div className="flex items-start gap-3 mb-3">
        <div className="testimonial-avatar">
          {t.avatar_url ? (
            <img
              src={cdnUrl(t.avatar_url)}
              alt={t.user_name || "Reviewer"}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-sm font-bold" style={{ color: "#89E900" }}>
              {(t.user_name || "A").charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold truncate"
            style={{ color: "#F5F5F0" }}
          >
            {t.user_name || "Anonymous"}
            {t.saved_amount && (
              <span
                className="ml-2 text-xs font-bold"
                style={{ color: "#89E900" }}
              >
                — Saved {t.saved_amount}
              </span>
            )}
          </p>
          {typeof t.rating === "number" && <Stars rating={t.rating} />}
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#B0B0A8" }}>
        "{t.comment}"
      </p>
    </article>
  );
}

/** @param {{ items: any[], avgRating: number|null, totalReviews: number }} props */
export default function TestimonialsCarousel({
  items = [],
  avgRating,
  totalReviews,
}) {
  const [page, setPage] = useState(0);
  const intervalRef = useRef(null);
  const displayItems = Array.isArray(items) ? items : [];
  const PER_PAGE = 3;
  const totalPages = Math.ceil(displayItems.length / PER_PAGE);

  const next = () => setPage((p) => (p + 1) % totalPages);

  useEffect(() => {
    if (totalPages <= 1) return;
    intervalRef.current = setInterval(next, 5000);
    return () => clearInterval(intervalRef.current);
  }, [totalPages, page]);

  if (displayItems.length === 0) return null;

  const visible = displayItems.slice(
    page * PER_PAGE,
    page * PER_PAGE + PER_PAGE,
  );
  const roundedAvg =
    typeof avgRating === "number" ? avgRating.toFixed(1) : null;

  return (
    <section className="mt-10" aria-labelledby="testimonials-heading">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 id="testimonials-heading" className="section-heading mb-1">
            Customer Testimonials
          </h2>
          {roundedAvg && (
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "#B0B0A8" }}
            >
              <Stars rating={Math.round(avgRating)} />
              <span style={{ color: "#F5F5F0", fontWeight: 600 }}>
                {roundedAvg}
              </span>
              <span>·</span>
              <span>{totalReviews || displayItems.length} reviews</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visible.map((t, i) => (
          <TestimonialCard key={`${page}-${i}`} t={t} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setPage(i);
                clearInterval(intervalRef.current);
              }}
              className="coverflow-dot"
              data-active={i === page ? "true" : "false"}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
