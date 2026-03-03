import React, { useState } from "react";

/**
 * Props:
 * - parents: array of parent categories
 * - childrenByParent: object mapping parentId → array of child categories
 */

export default function CategoryNavigator({ parents, childrenByParent }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (parentId) => {
    setExpanded((prev) => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1">
      {parents.map((parent) => (
        <div
          key={parent.id}
          className="card-base cursor-pointer transition hover:shadow-store-card"
        >
          <button
            onClick={() => toggle(parent.id)}
            aria-expanded={expanded[parent.id] ? "true" : "false"}
            aria-controls={`children-${parent.id}`}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-3">
              {parent.thumb_url && (
                <img
                  src={parent.thumb_url}
                  alt={parent.name}
                  className="w-12 h-12 object-cover rounded"
                  loading="lazy"
                />
              )}
              <h3 className="font-semibold text-lg text-brand-primary truncate">
                {parent.name}
              </h3>
            </div>
            <span className="text-gray-400">
              {expanded[parent.id] ? "−" : "+"}
            </span>
          </button>

          {expanded[parent.id] && childrenByParent[parent.id] && (
            <div
              id={`children-${parent.id}`}
              className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 transition-all duration-200"
            >
              {childrenByParent[parent.id].map((child) => (
                <a
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  className="flex justify-between items-center p-3 rounded-md border border-gray-200 hover:shadow-md transition"
                >
                  <span className="truncate">{child.name}</span>
                  <span className="pill pill-green text-xs">
                    {child.store_count}{" "}
                    {child.store_count === 1 ? "Store" : "Stores"}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
