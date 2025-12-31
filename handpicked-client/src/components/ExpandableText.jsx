import React, { useEffect, useRef, useState } from "react";

/**
 * ExpandableText.jsx — deterministic initial render to avoid hydration errors
 *
 * - Computes a simple deterministic collapsed snippet synchronously (server + client)
 *   so SSR output matches initial client DOM.
 * - After hydration, optionally performs a refined measurement and updates the snippet.
 *
 * Props:
 *  - html: string (sanitized HTML)
 *  - id: string
 *  - initialLines: number
 *  - className: string
 */

export default function ExpandableText({
  html = "",
  id = "expandable-text",
  initialLines = 2,
  className = "",
}) {
  const containerRef = useRef(null);
  const measureRef = useRef(null);

  // Determine initial collapsed snippet deterministically from plain text:
  const plain =
    typeof document === "undefined"
      ? stripHtmlToTextServer(html)
      : stripHtmlToText(html);
  const approxCharsPerLine = 120; // conservative heuristic (no DOM measurement)
  const initialCharLimit = Math.max(
    80,
    Math.floor(approxCharsPerLine * initialLines)
  );
  const needsToggleInitial = plain.length > initialCharLimit;
  const initialSnippet = needsToggleInitial
    ? plain.slice(0, initialCharLimit).trim() + "…"
    : plain;

  // States
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(needsToggleInitial);
  const [collapsedText, setCollapsedText] = useState(initialSnippet);
  const [measured, setMeasured] = useState(false);

  // Helper: strip HTML -> text (browser-safe)
  function stripHtmlToText(inputHtml) {
    const tmp = document.createElement("div");
    tmp.innerHTML = inputHtml;
    return tmp.textContent?.trim() ?? "";
  }
  // Helper for server-side (no document)
  function stripHtmlToTextServer(inputHtml) {
    // Basic HTML tag removal — works server-side
    return String(inputHtml || "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<\/?[^>]+(>|$)/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // After hydration, run measurement to refine the snippet based on real layout.
  // This is optional — it will update the DOM after hydration (no hydration mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!containerRef.current) return;
    // Heuristic: run only if we detected that a toggle is needed initially.
    if (!showToggle) {
      setMeasured(true);
      return;
    }

    const el = containerRef.current;
    // Create an invisible measurer
    const measurer = document.createElement("div");
    measurer.style.position = "absolute";
    measurer.style.visibility = "hidden";
    measurer.style.pointerEvents = "none";
    measurer.style.whiteSpace = "normal";

    const computed = window.getComputedStyle(el);
    measurer.style.font = computed.font;
    measurer.style.fontSize = computed.fontSize;
    measurer.style.lineHeight = computed.lineHeight;
    measurer.style.letterSpacing = computed.letterSpacing;
    measurer.style.width = `${el.clientWidth}px`;
    measurer.style.padding = computed.padding;
    measurer.style.boxSizing = computed.boxSizing;

    document.body.appendChild(measurer);
    measureRef.current = measurer;

    const fullText = stripHtmlToText(html);
    measurer.textContent = fullText;
    const fullHeight = measurer.getBoundingClientRect().height;
    const lineHeight =
      parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
    const targetHeight = Math.round(lineHeight * initialLines);

    if (fullHeight <= targetHeight + 1) {
      // fits — no toggle needed
      setShowToggle(false);
      setCollapsedText(fullText);
      setMeasured(true);
      document.body.removeChild(measurer);
      return;
    }

    // Binary search for best cut that fits
    let lo = 0;
    let hi = fullText.length;
    let best = "";
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      const trial = fullText.slice(0, mid).trim() + "…";
      measurer.textContent = trial + " View more";
      const h = measurer.getBoundingClientRect().height;
      if (h <= targetHeight + 1) {
        best = trial;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    if (best) {
      // Only update if it meaningfully differs from our initial snippet
      if (best !== collapsedText) setCollapsedText(best);
    } else {
      // fallback: keep initial snippet
    }

    setMeasured(true);
    document.body.removeChild(measurer);

    // re-measure on resize (debounced)
    let t = null;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        // re-run measurement
        setMeasured(false);
        setTimeout(() => setMeasured(true), 0);
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      if (measureRef.current && measureRef.current.parentNode) {
        try {
          measureRef.current.parentNode.removeChild(measureRef.current);
        } catch (e) {}
      }
    };
  }, [html, initialLines]); // run when html changes

  // Toggle handler
  const onToggle = (e) => {
    e.preventDefault();
    setExpanded((s) => !s);
    if (e.currentTarget && e.currentTarget.focus) e.currentTarget.focus();
  };

  // Chevron icon
  const Chevron = ({ open = false }) => (
    <svg
      className={`inline-block ml-1 -mt-0.5 transition-transform duration-150 ${
        open ? "rotate-180" : "rotate-0"
      }`}
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 8l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <div
      id={id}
      className={`expandable ${className}`}
      ref={containerRef}
      aria-live="polite"
    >
      {!expanded ? (
        <p className="text-gray-700 leading-relaxed m-0">
          {collapsedText}
          {showToggle && (
            <>
              {" "}
              <button
                type="button"
                className="inline-flex items-center ml-1 text-sm font-medium text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={id}
              >
                View more…
                <Chevron open={false} />
              </button>
            </>
          )}
        </p>
      ) : (
        <div className="leading-relaxed">
          <div dangerouslySetInnerHTML={{ __html: html }} />
          {showToggle && (
            <>
              {" "}
              <button
                type="button"
                className="inline-flex items-center ml-1 text-sm font-medium text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-300 rounded"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-controls={id}
              >
                Show less
                <Chevron open={true} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
