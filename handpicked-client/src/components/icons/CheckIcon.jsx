import React from "react";

export default function CheckIcon({
  className = "w-5 h-5 text-green-500 mt-0.5 mr-2 flex-shrink-0",
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
