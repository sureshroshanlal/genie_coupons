import React from "react";
import CheckIcon from "./icons/CheckIcon.jsx";
import DollarIcon from "./icons/DollarIcon.jsx";
import ShieldCheckIcon from "./icons/ShieldCheckIcon.jsx";

export default function WhyTrustUs() {
  const items = [
    {
      id: "verified",
      title: "Verified Daily",
      desc: "All coupons tested within the last 24 hours",
      icon: <CheckIcon />,
    },
    {
      id: "savings",
      title: "Real Savings",
      desc: "Average customer saves $55 per order",
      icon: <DollarIcon />,
    },
    {
      id: "secure",
      title: "Secure Connection",
      desc: "All data encrypted with SSL protection",
      icon: <ShieldCheckIcon />,
    },
  ];

  return (
    <aside className="card-base p-4" aria-labelledby="why-trust-us-heading">
      <h3
        id="why-trust-us-heading"
        className="text-sm font-bold uppercase tracking-widest mb-4"
        style={{ color: "#89E900" }}
      >
        Why Trust Us
      </h3>

      <ul className="space-y-4" role="list">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5"
              style={{ background: "rgba(137,233,0,0.1)" }}
            >
              {it.icon}
            </div>
            <div>
              <div
                className="text-sm font-semibold"
                style={{ color: "#F5F5F0" }}
              >
                {it.title}
              </div>
              <div
                className="text-xs mt-0.5 leading-relaxed"
                style={{ color: "#707068" }}
              >
                {it.desc}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
