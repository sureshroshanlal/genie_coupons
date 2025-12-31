// src/components/FAQAccordion.jsx
import React, { useState, useRef, useEffect } from "react";
import DOMPurify from "dompurify";

/**
 * FaqAccordion.jsx — drop-in replacement
 *
 * Props (unchanged):
 *  - faqs: Array<{ question, answer }>
 *  - defaultOpen: number | null
 *  - idPrefix: string
 *
 * Behavior:
 *  - Single-open by default (openIndex).
 *  - Expand All / Collapse All toggles multi-open mode (openSet).
 *  - Individual toggles work in single or multi mode.
 *  - Smooth expand/collapse using measured scrollHeight.
 */
export default function FaqAccordion({
  faqs,
  defaultOpen = null,
  idPrefix = "faq",
}) {
  const list = Array.isArray(faqs) ? faqs : [];
  // single-open index (default mode)
  const [openIndex, setOpenIndex] = useState(
    typeof defaultOpen === "number" &&
      defaultOpen >= 0 &&
      defaultOpen < list.length
      ? defaultOpen
      : null
  );
  // multi-open set for "Expand all" mode (store array of indexes)
  const [openSet, setOpenSet] = useState([]);
  // whether user activated expand-all (multi mode)
  const [multiMode, setMultiMode] = useState(false);

  // refs for headers and panels
  const headersRef = useRef([]);
  const panelsRef = useRef([]);

  useEffect(() => {
    headersRef.current = headersRef.current.slice(0, list.length);
    panelsRef.current = panelsRef.current.slice(0, list.length);
    // keep openSet valid if list shrinks
    setOpenSet((s) => s.filter((i) => i >= 0 && i < list.length));
    if (openIndex !== null && (openIndex < 0 || openIndex >= list.length))
      setOpenIndex(null);
  }, [list.length]);

  // toggle single or multi depending on mode
  const toggleItem = (i) => {
    if (multiMode) {
      setOpenSet((prev) => {
        const exists = prev.includes(i);
        if (exists) return prev.filter((x) => x !== i);
        return [...prev, i];
      });
    } else {
      setOpenIndex((prev) => (prev === i ? null : i));
    }
  };

  const expandAll = () => {
    const all = Array.from({ length: list.length }, (_, i) => i);
    setOpenSet(all);
    setMultiMode(true);
  };

  const collapseAll = () => {
    setOpenSet([]);
    setMultiMode(false);
    setOpenIndex(null);
  };

  // keyboard nav for headers (ARIA best-practices)
  const onKeyDownHeader = (e, i) => {
    const max = list.length - 1;
    const key = e.key;
    const code = e.code;
    if (key === "ArrowDown") {
      e.preventDefault();
      const next = i + 1 > max ? 0 : i + 1;
      headersRef.current[next]?.focus();
    } else if (key === "ArrowUp") {
      e.preventDefault();
      const prev = i - 1 < 0 ? max : i - 1;
      headersRef.current[prev]?.focus();
    } else if (key === "Home") {
      e.preventDefault();
      headersRef.current[0]?.focus();
    } else if (key === "End") {
      e.preventDefault();
      headersRef.current[max]?.focus();
    } else if (key === "Enter" || key === " " || code === "Space") {
      e.preventDefault();
      toggleItem(i);
    }
  };

  // animate panels using measured scrollHeight; respects reduced-motion
  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    panelsRef.current.forEach((panelEl, idx) => {
      if (!panelEl) return;
      const isOpen = multiMode ? openSet.includes(idx) : openIndex === idx;
      if (isOpen) {
        if (prefersReduced) {
          panelEl.style.maxHeight = "none";
        } else {
          panelEl.style.maxHeight = panelEl.scrollHeight + "px";
        }
      } else {
        panelEl.style.maxHeight = "0px";
      }
    });
  }, [openIndex, openSet, multiMode, list.length]);

  if (!list || list.length === 0) return null;

  return (
    <div className="w-full bg-white border border-gray-100 rounded-md shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-brand-primary">FAQs</h2>

        <div className="flex items-center gap-2">
          {/* Expand/Collapse controls */}
          <button
            type="button"
            onClick={expandAll}
            className="text-sm px-3 py-1 rounded-md border border-transparent bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            aria-label="Expand all FAQs"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-sm px-3 py-1 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            aria-label="Collapse all FAQs"
          >
            Collapse all
          </button>
        </div>
      </div>

      <div
        role="region"
        aria-label="Frequently asked questions"
        className="space-y-3"
      >
        {list.map((f, i) => {
          const rawQ =
            f && (f.question ?? f.q) ? String(f.question ?? f.q).trim() : "";
          const safeKey = rawQ
            ? rawQ
                .slice(0, 60)
                .replace(/\s+/g, "-")
                .replace(/[^a-zA-Z0-9-_]/g, "")
            : `faq-${i}`;
          const key = `faq-${safeKey}-${i}`;

          const isOpen = multiMode ? openSet.includes(i) : openIndex === i;
          const headerId = `${idPrefix}-header-${i}`;
          const panelId = `${idPrefix}-panel-${i}`;

          const question = rawQ;
          const answerRaw =
            f && (f.answer ?? f.a ?? f.ans)
              ? String(f.answer ?? f.a ?? f.ans).trim()
              : "";

          const containsHtml = /<\/?[a-z][\s\S]*>/i.test(answerRaw);
          const safeHtml = containsHtml ? DOMPurify.sanitize(answerRaw) : null;

          return (
            <div
              key={key}
              className="border border-gray-100 rounded-lg overflow-hidden"
            >
              <h3>
                <button
                  ref={(el) => (headersRef.current[i] = el)}
                  id={headerId}
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => toggleItem(i)}
                  onKeyDown={(e) => onKeyDownHeader(e, i)}
                  className="w-full text-left p-3 flex items-center justify-between gap-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                >
                  <span className="text-sm md:text-base font-medium text-gray-900">
                    {question}
                  </span>

                  <span
                    className={`ml-4 flex-shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? "rotate-180 text-brand-primary"
                        : "rotate-0 text-gray-400"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 7l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
              </h3>

              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                aria-hidden={!isOpen}
                ref={(el) => (panelsRef.current[i] = el)}
                className="px-3 pb-3 text-sm text-gray-700 transition-[max-height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] overflow-hidden"
                style={{ maxHeight: "0px" }}
              >
                <div className="pt-2">
                  {containsHtml ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: safeHtml }}
                    />
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {answerRaw}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
