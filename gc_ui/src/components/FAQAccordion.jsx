// src/components/FAQAccordion.jsx
import React, { useState, useRef, useEffect } from "react";
import createDOMPurify from "isomorphic-dompurify";

const DOMPurify = createDOMPurify(
  typeof window !== "undefined" ? window : undefined
);

export default function FaqAccordion({
  faqs,
  defaultOpen = null,
  idPrefix = "faq",
}) {
  const list = Array.isArray(faqs) ? faqs : [];
  const [openIndex] = useState(null);
  const [openSet, setOpenSet] = useState(list.map((_, i) => i));
  const [multiMode, setMultiMode] = useState(true);
  const headersRef = useRef([]);
  const panelsRef = useRef([]);

  useEffect(() => {
    headersRef.current = headersRef.current.slice(0, list.length);
    panelsRef.current = panelsRef.current.slice(0, list.length);
    setOpenSet((s) => s.filter((i) => i >= 0 && i < list.length));
  }, [list.length]);

  const toggleItem = (i) => {
    if (multiMode) {
      setOpenSet((prev) =>
        prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
      );
    } else {
      setOpenIndex((prev) => (prev === i ? null : i));
    }
  };

  const expandAll = () => {
    setOpenSet(list.map((_, i) => i));
    setMultiMode(true);
  };
  const collapseAll = () => {
    setOpenSet([]);
    setMultiMode(false);
  };

  const onKeyDownHeader = (e, i) => {
    const max = list.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      headersRef.current[i + 1 > max ? 0 : i + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      headersRef.current[i - 1 < 0 ? max : i - 1]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      headersRef.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      headersRef.current[max]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleItem(i);
    }
  };

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    panelsRef.current.forEach((panelEl, idx) => {
      if (!panelEl) return;
      const isOpen = multiMode ? openSet.includes(idx) : openIndex === idx;
      panelEl.style.maxHeight = isOpen
        ? prefersReduced
          ? "none"
          : panelEl.scrollHeight + "px"
        : "0px";
    });
  }, [openIndex, openSet, multiMode, list.length]);

  if (!list.length) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-heading mb-0">FAQs</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-xs px-3 py-1 rounded-full font-semibold transition"
            style={{
              background: "rgba(137,233,0,0.1)",
              color: "#89E900",
              border: "1px solid rgba(137,233,0,0.2)",
            }}
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs px-3 py-1 rounded-full font-semibold transition"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            Collapse all
          </button>
        </div>
      </div>

      <div
        role="region"
        aria-label="Frequently asked questions"
        className="space-y-2"
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
          const isOpen = multiMode ? openSet.includes(i) : openIndex === i;
          const headerId = `${idPrefix}-header-${i}`;
          const panelId = `${idPrefix}-panel-${i}`;
          const answerRaw =
            f && (f.answer ?? f.a ?? f.ans)
              ? String(f.answer ?? f.a ?? f.ans).trim()
              : "";
          const containsHtml = /<\/?[a-z][\s\S]*>/i.test(answerRaw);
          const safeHtml = containsHtml ? DOMPurify.sanitize(answerRaw) : null;

          return (
            <div
              key={`faq-${safeKey}-${i}`}
              style={{
                background: isOpen ? "var(--bg-elevated)" : "var(--bg-surface)",
                border: `1px solid ${isOpen ? "rgba(137,233,0,0.2)" : "var(--border-default)"}`,
                borderRadius: "10px",
                overflow: "hidden",
                transition: "border-color 150ms ease, background 150ms ease",
              }}
            >
              <h3>
                <button
                  ref={(el) => (headersRef.current[i] = el)}
                  id={headerId}
                  aria-controls={panelId}
                  aria-expanded={isOpen}
                  onClick={() => toggleItem(i)}
                  onKeyDown={(e) => onKeyDownHeader(e, i)}
                  className="w-full text-left flex items-center justify-between gap-4 focus:outline-none"
                  style={{ padding: "0.75rem 1rem" }}
                >
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: isOpen ? "#F5F5F0" : "var(--text-secondary)",
                    }}
                  >
                    {rawQ}
                  </span>
                  <span
                    className="flex-shrink-0 transition-transform duration-200"
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      color: isOpen ? "#89E900" : "var(--text-muted)",
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 7l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
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
                className="overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
                style={{ maxHeight: "0px" }}
              >
                <div
                  style={{
                    padding: "0 1rem 0.875rem",
                    borderTop: "1px solid var(--border-default)",
                  }}
                >
                  <div className="pt-3">
                    {containsHtml ? (
                      <div
                        className="prose prose-sm max-w-none"
                        style={{ color: "var(--text-secondary)" }}
                        dangerouslySetInnerHTML={{ __html: safeHtml }}
                      />
                    ) : (
                      <p
                        className="text-sm whitespace-pre-wrap"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {answerRaw}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
