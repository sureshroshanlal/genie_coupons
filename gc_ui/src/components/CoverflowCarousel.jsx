// src/components/CoverflowCarousel.jsx
import { useState, useRef, useEffect, useCallback } from "react";

const ROTATION = 40; // deg Y rotation for side cards
const SCALE_SIDE = 0.78;
const SCALE_FAR = 0.62;
const TRANSLATE_X = 52; // % shift for side cards
const AUTOPLAY_MS = 4500;

function getTransform(offset) {
  if (offset === 0) return "translateX(0) rotateY(0deg) scale(1)";
  const dir = offset > 0 ? 1 : -1;
  const abs = Math.abs(offset);
  const rot = dir * ROTATION;
  const tx = dir * TRANSLATE_X * (abs === 1 ? 1 : 1.7);
  const scale = abs === 1 ? SCALE_SIDE : SCALE_FAR;
  return `translateX(${tx}%) rotateY(${rot}deg) scale(${scale})`;
}

function getZIndex(offset) {
  if (offset === 0) return 10;
  if (Math.abs(offset) === 1) return 5;
  return 1;
}

function getOpacity(offset) {
  if (offset === 0) return 1;
  if (Math.abs(offset) === 1) return 0.75;
  return 0.35;
}

export default function CoverflowCarousel({ banners = [] }) {
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartX = useRef(null);
  const autoplayRef = useRef(null);
  const total = banners.length;

  const go = useCallback(
    (idx) => {
      setActive(((idx % total) + total) % total);
    },
    [total],
  );

  const startAutoplay = useCallback(() => {
    clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => go(active + 1), AUTOPLAY_MS);
  }, [active, go]);

  useEffect(() => {
    if (total <= 1) return;
    startAutoplay();
    return () => clearInterval(autoplayRef.current);
  }, [active, total]);

  const onDragStart = (e) => {
    dragStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setDragging(true);
    clearInterval(autoplayRef.current);
  };

  const onDragEnd = (e) => {
    if (!dragging || dragStartX.current === null) return;
    const endX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
    const delta = endX - dragStartX.current;
    if (Math.abs(delta) > 50) go(active + (delta < 0 ? 1 : -1));
    dragStartX.current = null;
    setDragging(false);
    startAutoplay();
  };

  if (!total) return null;

  // show at most 5 cards: active ± 2
  const visible = [-2, -1, 0, 1, 2].map((offset) => {
    const idx = (((active + offset) % total) + total) % total;
    return { idx, offset };
  });

  return (
    <div
      className="coverflow-root"
      aria-label="Featured store banners"
      role="region"
    >
      <div
        className="coverflow-stage"
        onMouseDown={onDragStart}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={onDragStart}
        onTouchEnd={onDragEnd}
      >
        {visible.map(({ idx, offset }) => {
          const b = banners[idx];
          const fallback = b.variants?.fallback || b.variants?.webp?.[0] || "";
          const webpVariants = b.variants?.webp || [];
          // const webpSrc = b.variants?.webp?.[1] || fallback;
          const clickUrl = b.click_url || null;

          const card = (
            <div
              key={`${idx}-${offset}`}
              className="coverflow-card"
              style={{
                transform: getTransform(offset),
                zIndex: getZIndex(offset),
                opacity: getOpacity(offset),
                transition: dragging
                  ? "none"
                  : "transform 420ms cubic-bezier(.22,.9,.28,1), opacity 420ms ease",
                cursor:
                  offset === 0 ? (clickUrl ? "pointer" : "default") : "pointer",
              }}
              onClick={() => offset !== 0 && go(active + offset)}
              aria-hidden={offset !== 0}
            >
              <div className="coverflow-card-inner">
                <img
                  src={fallback}
                  srcSet={webpVariants
                    .map((url, i) => `${url} ${[516, 800, 1200][i]}w`)
                    .join(", ")}
                  sizes="(max-width: 768px) 516px, (max-width: 1200px) 800px, 1200px"
                  alt={b.alt || `Banner ${idx + 1}`}
                  loading={offset === 0 ? "eager" : "lazy"}
                  fetchpriority="high"
                  decoding={offset === 0 ? "sync" : "async"}
                  draggable={false}
                  width={516}
                  height={290}
                />
                {/* Active card overlay with store info */}
                {offset === 0 && (b.store_name || b.label) && (
                  <div className="coverflow-card-overlay">
                    {b.store_name && (
                      <span className="coverflow-store-name">
                        {b.store_name}
                      </span>
                    )}
                    {b.label && (
                      <span className="coverflow-label">{b.label}</span>
                    )}
                    {clickUrl && (
                      <a
                        href={clickUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="coverflow-cta"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Shop Now →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );

          return card;
        })}
      </div>

      {/* Dots */}
      {total > 1 && (
        <div className="coverflow-dots" role="tablist">
          {banners.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Go to banner ${i + 1}`}
              className="coverflow-dot"
              data-active={i === active ? "true" : "false"}
              onClick={() => {
                go(i);
                clearInterval(autoplayRef.current);
                startAutoplay();
              }}
            />
          ))}
        </div>
      )}

      {/* Prev / Next */}
      {total > 1 && (
        <>
          <button
            className="coverflow-arrow coverflow-arrow--left"
            aria-label="Previous banner"
            onClick={() => {
              go(active - 1);
              clearInterval(autoplayRef.current);
              startAutoplay();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 18l-6-6 6-6"
              />
            </svg>
          </button>
          <button
            className="coverflow-arrow coverflow-arrow--right"
            aria-label="Next banner"
            onClick={() => {
              go(active + 1);
              clearInterval(autoplayRef.current);
              startAutoplay();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 18l6-6-6-6"
              />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
