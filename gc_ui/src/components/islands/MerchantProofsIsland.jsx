// src/components/islands/MerchantProofsIsland.jsx
import { useState, useEffect } from "react";
import { cdnUrl } from '../../utils/cdnUrl.js';

/**
 * @param {{ proofs: any[], mode?: "strip" | "grid", visitUrl: string }} props
 * mode="strip" → compact horizontal scroll row (for hero section)
 * mode="grid"  → 2×4 grid with lightbox (original behaviour)
 */
export default function MerchantProofsIsland({
  proofs: initialProofs = [],
  mode = "grid",
  visitUrl = "#",
}) {
  const proofsArr = Array.isArray(initialProofs) ? initialProofs : [];
  const [startIndex, setStartIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const VISIBLE_COUNT = 4;
  const maxStart = Math.max(0, proofsArr.length - VISIBLE_COUNT);
  const visibleProofs = proofsArr.slice(startIndex, startIndex + VISIBLE_COUNT);

  useEffect(() => {
    setStartIndex(0);
  }, [proofsArr.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i - 1 + proofsArr.length) % proofsArr.length);
      if (e.key === "ArrowRight")
        setLightboxIndex((i) => (i + 1) % proofsArr.length);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [lightboxIndex, proofsArr.length]);

  if (proofsArr.length === 0) return null;

  const openLightbox = (idx) => setLightboxIndex(idx);
  const closeLightbox = () => setLightboxIndex(null);
  const lbPrev = (e) => {
    e?.stopPropagation();
    setLightboxIndex((i) => (i - 1 + proofsArr.length) % proofsArr.length);
  };
  const lbNext = (e) => {
    e?.stopPropagation();
    setLightboxIndex((i) => (i + 1) % proofsArr.length);
  };

  // ── STRIP MODE (hero) ─────────────────────────────────────────────────────
  if (mode === "strip") {
    return (
      <>
        <div className="proof-strip" aria-label="Coupon proof images">
          {proofsArr.map((p, idx) => (
            <button
              key={p.id ?? idx}
              onClick={() => openLightbox(idx)}
              className="proof-strip-thumb"
              aria-label={`View proof: ${p.filename}`}
              title={p.filename}
            >
              <img
                src={cdnUrl(p.image_url)}
                alt={p.filename}
                loading="lazy"
                decoding="async"
              />
              <div className="proof-strip-label">{p.filename}</div>
            </button>
          ))}
        </div>

        {/* Lightbox */}
        {lightboxIndex !== null && (
          <Lightbox
            proofs={proofsArr}
            index={lightboxIndex}
            onClose={closeLightbox}
            onPrev={lbPrev}
            onNext={lbNext}
            visitUrl={visitUrl}
          />
        )}
      </>
    );
  }

  // ── GRID MODE (original) ───────────────────────────────────────────────────
  const canPrev = startIndex > 0;
  const canNext = startIndex < maxStart;
  const goPrev = (e) => {
    e?.stopPropagation();
    if (canPrev) setStartIndex((s) => Math.max(0, s - 1));
  };
  const goNext = (e) => {
    e?.stopPropagation();
    if (canNext) setStartIndex((s) => Math.min(maxStart, s + 1));
  };

  return (
    <section className="mt-8" aria-labelledby="merchant-proofs-heading">
      <h2 id="merchant-proofs-heading" className="section-heading">
        Coupon Proof Images
      </h2>
      <div className="relative mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibleProofs.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => openLightbox(startIndex + idx)}
              className="relative block rounded-xl p-[2px] bg-gradient-to-br from-[rgba(255,90,31,0.4)] via-transparent to-[rgba(184,242,0,0.5)] hover:shadow-md hover:scale-[1.02] transition-all duration-300"
              aria-label={`Open proof ${p.filename}`}
            >
              <div className="bg-white rounded-xl overflow-hidden m-[1px]">
                <img
                  src={cdnUrl(p.image_url)}
                  alt={p.filename}
                  loading="lazy"
                  decoding="async"
                  className="object-cover w-full h-32 sm:h-36 lg:h-40"
                />
                <div className="text-xs text-gray-500 mt-1 px-1 truncate">
                  {p.filename}
                </div>
              </div>
              {idx === visibleProofs.length - 1 &&
                startIndex + idx < proofsArr.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goNext(e);
                    }}
                    className="absolute top-1/2 right-2 -translate-y-1/2 bg-black bg-opacity-60 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-opacity-80 focus:outline-none"
                    aria-label="Next proofs"
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M9 18l6-6-6-6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              {idx === 0 && startIndex > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrev(e);
                  }}
                  className="absolute top-1/2 left-2 -translate-y-1/2 bg-black bg-opacity-60 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-opacity-80 focus:outline-none"
                  aria-label="Previous proofs"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M15 18l-6-6 6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </button>
          ))}
        </div>
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          proofs={proofsArr}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={lbPrev}
          onNext={lbNext}
          visitUrl={visitUrl}
        />
      )}
    </section>
  );
}

function Lightbox({ proofs, index, onClose, onPrev, onNext, visitUrl }) {
  const item = proofs[index];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPrev(e);
        }}
        className="absolute left-4 text-white text-4xl"
      >
        ‹
      </button>

      <a
        href={visitUrl || "#"}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={cdnUrl(item.image_url)}
          alt={item.filename}
          className="max-h-full max-w-full rounded shadow-lg"
        />
      </a>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onNext(e);
        }}
        className="absolute right-4 text-white text-4xl"
      >
        ›
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 text-white text-2xl"
      >
        ×
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/90 bg-black/40 px-3 py-1 rounded">
        {item.filename} — {index + 1}/{proofs.length}
      </div>
    </div>
  );
}
