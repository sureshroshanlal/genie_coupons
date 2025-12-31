// src/components/BannerCarousel.jsx
import React, { useEffect, useRef, useState } from "react";

const WIDTHS = [320, 768, 1024, 1600];
const SIZES = "(max-width:640px) 100vw, 1200px";
const AUTOPLAY_MS = 5000; // slide interval

function makeSrcset(arr = []) {
  return arr
    .map((src, i) => `${src} ${WIDTHS[i] || WIDTHS[WIDTHS.length - 1]}w`)
    .join(", ");
}

export default function BannerCarousel({ banners = [] }) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const touchStartX = useRef(null);
  const autoplayTimer = useRef(null);

  const [index, setIndex] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const total = (banners && banners.length) || 0;
  if (!total) return null;

  // Helper to clamp and wrap index
  const goTo = (i) => {
    const wrapped = ((i % total) + total) % total;
    setIndex(wrapped);
    if (trackRef.current)
      trackRef.current.style.transform = `translateX(-${wrapped * 100}%)`;
  };

  // Start autoplay
  const startAutoplay = () => {
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
    autoplayTimer.current = setInterval(() => {
      if (!isPaused) {
        setIndex((prev) => {
          const next = (prev + 1) % total;
          if (trackRef.current)
            trackRef.current.style.transform = `translateX(-${next * 100}%)`;
          return next;
        });
      }
    }, AUTOPLAY_MS);
  };

  const stopAutoplay = () => {
    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
  };

  // Client-side lifecycle: keyboard, touch, hover, autoplay
  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    // Initialize transform + transition
    track.style.transition = "transform 420ms cubic-bezier(.22,.9,.28,1)";
    track.style.willChange = "transform";
    track.style.transform = `translateX(-${index * 100}%)`;

    // Keyboard nav
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === "ArrowRight") goTo(index + 1);
    };
    window.addEventListener("keydown", onKey);

    // Touch / mouse swipe support
    const onTouchStart = (ev) => {
      stopAutoplay();
      touchStartX.current = ev.touches ? ev.touches[0].clientX : ev.clientX;
      track.style.transition = "none";
    };
    const onTouchMove = (ev) => {
      if (touchStartX.current == null) return;
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const delta = x - touchStartX.current;
      track.style.transform = `translateX(calc(-${index * 100}% + ${delta}px))`;
    };
    const onTouchEnd = (ev) => {
      const endX =
        (ev.changedTouches && ev.changedTouches[0].clientX) ||
        ev.clientX ||
        touchStartX.current;
      const delta = endX - (touchStartX.current || 0);
      touchStartX.current = null;
      track.style.transition = "transform 420ms cubic-bezier(.22,.9,.28,1)";
      if (Math.abs(delta) > 60) {
        if (delta > 0) goTo(index - 1);
        else goTo(index + 1);
      } else {
        goTo(index);
      }
      startAutoplay();
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("mousedown", onTouchStart);
    container.addEventListener("mousemove", onTouchMove);
    container.addEventListener("mouseup", onTouchEnd);

    // Pause on hover/focus
    const onEnter = () => {
      setPaused(true);
      stopAutoplay();
    };
    const onLeave = () => {
      setPaused(false);
      startAutoplay();
    };
    container.addEventListener("mouseenter", onEnter);
    container.addEventListener("mouseleave", onLeave);
    container.addEventListener("focusin", onEnter);
    container.addEventListener("focusout", onLeave);

    // Kick off autoplay
    startAutoplay();

    return () => {
      stopAutoplay();
      window.removeEventListener("keydown", onKey);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("mousedown", onTouchStart);
      container.removeEventListener("mousemove", onTouchMove);
      container.removeEventListener("mouseup", onTouchEnd);
      container.removeEventListener("mouseenter", onEnter);
      container.removeEventListener("mouseleave", onLeave);
      container.removeEventListener("focusin", onEnter);
      container.removeEventListener("focusout", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, index]);

  // render
  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-w-6xl rounded-2xl overflow-hidden shadow-xl border border-white/10 bg-gradient-to-b from-white/5 to-black/10"
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured deals"
      tabIndex={-1}
    >
      {/* Viewport */}
      <div className="w-full overflow-hidden">
        <div
          ref={trackRef}
          className="flex w-full h-full"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((b, i) => {
            const avifSrcset = makeSrcset(b.variants?.avif || []);
            const webpSrcset = makeSrcset(b.variants?.webp || []);
            const fallback =
              b.variants?.fallback ||
              b.fallback ||
              b.src ||
              (b.variants?.webp && b.variants.webp.slice(-1)[0]) ||
              "";
            const isFirst = i === 0;
            return (
              <div
                key={b.id ?? i}
                className="flex-[0_0_100%] relative aspect-[16/5] bg-gray-100"
                role="group"
                aria-roledescription="slide"
                aria-label={b.alt || `Slide ${i + 1}`}
              >
                {/* gradient overlay for polish */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/8 to-transparent z-10 pointer-events-none" />
                <picture>
                  {avifSrcset ? (
                    <source
                      type="image/avif"
                      srcSet={avifSrcset}
                      sizes={SIZES}
                    />
                  ) : null}
                  {webpSrcset ? (
                    <source
                      type="image/webp"
                      srcSet={webpSrcset}
                      sizes={SIZES}
                    />
                  ) : null}
                  <img
                    src={fallback}
                    alt={b.alt || ""}
                    width="1200"
                    height={Math.round((1200 * 5) / 16)}
                    loading={isFirst ? "eager" : "lazy"}
                    fetchPriority={isFirst ? "high" : "auto"}
                    decoding="async"
                    className="w-full h-full object-cover object-center absolute inset-0"
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </picture>
              </div>
            );
          })}
        </div>
      </div>

      {/* Left arrow */}
      <button
        onClick={() => goTo(index - 1)}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-brand-primary hover:text-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg backdrop-blur-sm transition"
      >
        <span aria-hidden>◀</span>
      </button>

      {/* Right arrow */}
      <button
        onClick={() => goTo(index + 1)}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-brand-primary hover:text-white text-gray-800 rounded-full w-12 h-12 flex items-center justify-center shadow-lg backdrop-blur-sm transition"
      >
        <span aria-hidden>▶</span>
      </button>

      {/* Dots — single visible dot, 44x44 hit area, visible focus */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {banners.map((_, i) => {
            const isActive = index === i;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={
                  `inline-flex items-center justify-center rounded-full transition-transform ` +
                  `w-11 h-11 p-0 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 bg-transparent`
                }
              >
                {/* only this span is visible as the dot */}
                <span
                  aria-hidden="true"
                  className={`block w-3 h-3 rounded-full transition-transform ${
                    isActive
                      ? "bg-brand-primary scale-110 shadow-md"
                      : "bg-[rgba(255,255,255,0.6)] hover:bg-white"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
