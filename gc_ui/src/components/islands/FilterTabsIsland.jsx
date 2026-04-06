// src/components/islands/FilterTabsIsland.jsx
import { useState, useEffect } from "react";

const TABS = [
  { key: "all", label: "All" },
  { key: "coupon", label: "Coupons" },
  { key: "deal", label: "Deals" },
  { key: "editor", label: "Editor Picks" },
];

/**
 * @param {{
 *   counts: { all: number, coupon: number, deal: number, editor: number },
 *   listId: string
 * }} props
 */
export default function FilterTabsIsland({ counts = {}, listId }) {
  const [active, setActive] = useState("all");

  useEffect(() => {
    const container = document.getElementById(listId);
    if (!container) return;

    const items = container.querySelectorAll("[data-coupon-wrapper]");
    items.forEach((item) => {
      const card = item.querySelector(".coupon-card");
      if (!card) return;
      const type = card.dataset.type || "deal";
      const isEditor = card.dataset.editor === "true";
      const show =
        active === "all" ||
        active === type ||
        (active === "editor" && isEditor);
      item.style.display = show ? "" : "none";
    });
  }, [active, listId]);

  return (
    <div
      className="flex items-center gap-2 flex-wrap mb-4"
      role="tablist"
      aria-label="Filter coupons"
    >
      {TABS.map((tab) => {
        const count = counts[tab.key] ?? 0;
        if (count === 0 && tab.key !== "all") return null;
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActive(tab.key)}
            className="filter-tab"
            data-active={isActive ? "true" : "false"}
          >
            {tab.label}
            {count > 0 && <span className="filter-tab-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
