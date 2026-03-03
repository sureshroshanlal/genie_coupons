import React from "react";
import CheckIcon from "./icons/CheckIcon.jsx";
import DollarIcon from "./icons/DollarIcon.jsx";
import ShieldCheckIcon from "./icons/ShieldCheckIcon.jsx";

export default function WhyTrustUs() {
  const items = [
    {
      id: "verified",
      title: "Verified Daily",
      desc: "All coupons tested within last 24 hours",
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
      <h3 id="why-trust-us-heading" className="section-heading mb-3">
        Why Trust Us
      </h3>

      <ul className="space-y-4 text-sm text-gray-700" role="list">
        {items.map((it) => (
          <li key={it.id} className="flex items-start">
            {it.icon}
            <div>
              <div className="font-medium text-gray-900">{it.title}</div>
              <div className="text-gray-600">{it.desc}</div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
