import React from "react";

/**
 * @typedef {Object} Testimonial
 * @property {string|number} id
 * @property {string} [user_name]
 * @property {number} [rating]
 * @property {string} [comment]
 * @property {string} [avatar_url]
 * @property {string} [posted_at]
 */

/**
 * @param {{
 *   items?: Testimonial[],
 *   avgRating?: number | null,
 *   totalReviews?: number | null
 * }} props
 */

/**
 * TestimonialsList.jsx - refactored to use global card styles
 */

function StarIcon({ filled = false }) {
  return (
    <svg
      className={`w-4 h-4 ${filled ? "text-yellow-400" : "text-gray-200"}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.447a1 1 0 00-.364 1.118l1.287 3.95c.3.921-.755 1.688-1.54 1.118L10 13.347l-3.372 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.95a1 1 0 00-.364-1.118L2.642 9.377c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.95z" />
    </svg>
  );
}

export default function TestimonialsList({
  items,
  avgRating = any,
  totalReviews = 0,
}) {
  const displayItems = Array.isArray(items) ? items.slice(0, 5) : [];

  const ratingNumber = typeof avgRating === "number" ? avgRating : null;
  const roundedAvg = ratingNumber !== null ? Math.round(ratingNumber) : 0;
  const reviewsCount = totalReviews ?? displayItems.length;

  return (
    <section className="card-base p-4" aria-labelledby="testimonials-heading">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold text-brand-secondary">
              Customer testimonials
            </h2> 

          <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
            <div className="flex items-center" aria-hidden="true">
              <div className="flex items-center mr-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} filled={i < roundedAvg} />
                ))}
              </div>
              <span className="sr-only">
                {ratingNumber ? `${ratingNumber} out of 5` : "No rating"}
              </span>
              <span className="text-sm">
                {ratingNumber ? ratingNumber.toFixed(1) : "—"}
              </span>
            </div>

            <span className="text-sm text-gray-400">•</span>

            <span className="text-sm">{reviewsCount} reviews</span>
          </div>
        </div>

        <div>
          <a
            href="#reviews"
            className="btn btn-outline" aria-label="See all reviews"
          >
            See all reviews
          </a>
        </div>
      </div>

      <div className="space-y-3">
        {displayItems.length === 0 ? (
          <p className="text-sm text-gray-600">No testimonials yet.</p>
        ) : (
          displayItems.map((t) => (
            <article
              key={t.id}
              className="border border-gray-100 rounded p-3 bg-white"
              aria-label={`Testimonial by ${t.user_name ?? "Anonymous"}`}
              role="article"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {t.avatar_url ? (
                    <img
                      src={t.avatar_url}
                      alt={
                        t.user_name
                          ? `${t.user_name}'s avatar`
                          : "Reviewer avatar"
                      }
                      className="object-cover w-full h-full"
                      loading="lazy"
                      decoding="async"
                      width="40"
                      height="40"
                    />
                  ) : (
                    <span className="text-xs text-gray-500">
                      {(t.user_name || "A").slice(0, 1)}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {t.user_name || "Anonymous"}
                      </p>

                      <div className="flex items-center text-xs text-gray-500 mt-0.5">
                        {typeof t.rating === "number" && (
                          <>
                            <span className="mr-2 text-sm">{t.rating}</span>
                            <div className="flex" aria-hidden="true">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <StarIcon
                                  key={i}
                                  filled={i < Math.round(t.rating)}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {/* {t.posted_at && (
                          <time
                            className="ml-2"
                            dateTime={new Date(t.posted_at).toISOString()}
                          >
                            • {new Date(t.posted_at).toLocaleDateString()}
                          </time>
                        )} */}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2 text-sm text-gray-700 clamp-3">
                    {t.comment}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
