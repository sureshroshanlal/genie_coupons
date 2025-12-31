import React from "react";

/**
 * RecentActivity.jsx - production ready
 *
 * - Uses .card-base for consistent card styling.
 * - Heading uses .section-heading.
 * - Count highlighted with .pill for visual consistency.
 * - Items: clickable title + meta (date + short desc).
 * - Truncate helper preserved.
 */

export default function RecentActivity({ data }) {
  const total = data?.total_offers_added_last_30d ?? 0;
  const recent = Array.isArray(data?.recent) ? data.recent.slice(0, 6) : [];

  return (
    <aside className="card-base p-4">
      <h3 className="section-heading mb-2">Recent activity</h3>

      <p className="text-sm text-gray-600 mb-3">
        <span className="pill pill-green">{total}</span>{" "}
        <span className="ml-1">offers added in the last 30 days</span>
      </p>

      {recent.length === 0 ? (
        <p className="text-sm text-gray-500">No recent activity.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((r) => (
            <li key={r.id} className="flex items-start gap-2">
              <div
                className="w-2.5 h-2.5 mt-1 rounded-full bg-indigo-500 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <a
                  href={`#offer-${r.id}`}
                  className="text-sm font-medium text-gray-800 hover:underline truncate block"
                >
                  {r.title || (r.type ? `${r.type} offer` : "Offer")}
                </a>
                <div className="text-xs text-gray-500 truncate">
                  {/* {r.published_at ? (
                    <time dateTime={new Date(r.published_at).toISOString()}>
                      {new Date(r.published_at).toLocaleDateString()}
                    </time>
                  ) : null} */}
                  {r.short_desc ? <>{truncate(r.short_desc, 80)}</> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

// small helper to truncate text
function truncate(str = "", n = 80) {
  if (str.length <= n) return str;
  return str.slice(0, n - 1).trimEnd() + "…";
}
