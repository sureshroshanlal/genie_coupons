import { useEffect, useState } from "react";

const PILL_ICON_TAG = (
  <svg
    class="w-3 h-3 mr-1"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

const PILL_ICON_STORE = (
  <svg
    class="w-3 h-3 mr-1"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const PILL_ICON_CLOCK = (
  <svg
    class="w-3 h-3 mr-1"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.5"
    aria-hidden="true"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function fmt(n) {
  if (n >= 1000) return `${Math.floor(n / 100) * 100}+`;
  return `${n}+`;
}

// Fallback values shown before fetch resolves or on error
const FALLBACK = { total_coupons: 1000, total_stores: 100 };

export default function HeroStatsIsland({ apiUrl }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`${apiUrl}/stats`)
      .then((r) => {
        if (!r.ok) throw new Error("stats fetch failed");
        return r.json();
      })
      .then((json) => {
        const d = json?.data;
        if (d?.total_coupons != null) setStats(d);
      })
      .catch(() => {
        // silently fall through — fallback values already in render
      });
  }, []);

  const coupons = stats?.total_coupons ?? FALLBACK.total_coupons;
  const stores = stats?.total_stores ?? FALLBACK.total_stores;

  return (
    <div class="homepage-hero-stats">
      <span class="pill pill-green">
        {PILL_ICON_TAG}
        {fmt(coupons)} verified coupons
      </span>
      <span class="pill pill-gray">
        {PILL_ICON_STORE}
        {fmt(stores)} stores
      </span>
      <span class="pill pill-gray">
        {PILL_ICON_CLOCK}
        Updated daily
      </span>
    </div>
  );
}
