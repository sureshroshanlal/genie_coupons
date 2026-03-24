import { useState } from "react";

/**
 * StarRating
 * Props:
 *   value (number) — current rating 0-5
 *   onChange (fn) — called with new rating, only if interactive
 *   interactive (bool) — default false (display only)
 *   size (number) — px size of each star, default 16
 */
export default function StarRating({
  value = 0,
  onChange,
  interactive = false,
  size = 16,
}) {
  const [hovered, setHovered] = useState(0);

  const display = interactive ? hovered || value : value;

  return (
    <div
      style={{ display: "flex", gap: "2px", alignItems: "center" }}
      role={interactive ? "radiogroup" : "img"}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => interactive && onChange?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          style={{
            cursor: interactive ? "pointer" : "default",
            fontSize: `${size}px`,
            color: star <= display ? "#89E900" : "#333",
            transition: "color 0.1s",
            lineHeight: 1,
            userSelect: "none",
          }}
          role={interactive ? "radio" : undefined}
          aria-checked={interactive ? star === value : undefined}
          aria-label={interactive ? `${star} star` : undefined}
        >
          ★
        </span>
      ))}
    </div>
  );
}
