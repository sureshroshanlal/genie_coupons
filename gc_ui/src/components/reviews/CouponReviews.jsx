import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import LoginModal from "../auth/LoginModal";

const API = import.meta.env.PUBLIC_API_BASE_URL;

export default function CouponReviews({ couponId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [aggregate, setAggregate] = useState({ avg_rating: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [domReady, setDomReady] = useState(false);

  const [summaryEl, setSummaryEl] = useState(null);
  const [chevronEl, setChevronEl] = useState(null);
  const [panelEl, setPanelEl] = useState(null);
  const [toggleEl, setToggleEl] = useState(null);

  // Wait for card HTML to be injected before looking up DOM elements
  useEffect(() => {
    let attempts = 0;
    const MAX = 20;
    const interval = setInterval(() => {
      const summary = document.getElementById(`gc-reviews-summary-${couponId}`);
      const chevron = document.getElementById(`gc-reviews-chevron-${couponId}`);
      const panel = document.getElementById(`gc-reviews-panel-${couponId}`);
      const toggle = document.getElementById(`gc-reviews-toggle-${couponId}`);
      if (summary && chevron && panel && toggle) {
        if (panel.dataset.claimed === "true") {
          clearInterval(interval);
          return;
        }
        panel.dataset.claimed = "true";
        setSummaryEl(summary);
        setChevronEl(chevron);
        setPanelEl(panel);
        setToggleEl(toggle);
        setDomReady(true);
        clearInterval(interval);
      }
      if (++attempts >= MAX) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [couponId]);

  async function fetchReviews() {
    try {
      const res = await fetch(`${API}/reviews/${couponId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setAggregate(data.aggregate || { avg_rating: 0, total: 0 });
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (couponId) fetchReviews();
  }, [couponId]);

  // Update summary text once DOM + data are both ready
  useEffect(() => {
    if (!summaryEl || loading) return;
    if (aggregate.total > 0) {
      summaryEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:5px;">
        <span style="color:#89E900;font-size:11px;">★</span>
        <span style="color:#888;font-size:12px;">${aggregate.avg_rating} · ${aggregate.total} ${aggregate.total === 1 ? "review" : "reviews"}</span>
      </span>`;
    } else {
      summaryEl.innerHTML = `<span style="color:#555;font-size:12px;">✦ Be the first to review</span>`;
    }
  }, [loading, aggregate, summaryEl]);

  // Attach toggle click handler
  useEffect(() => {
    if (!toggleEl || !panelEl || !chevronEl) return;
    const handler = () => setOpen((o) => !o);
    toggleEl.addEventListener("click", handler);
    return () => toggleEl.removeEventListener("click", handler);
  }, [toggleEl, panelEl, chevronEl]);

  // Show/hide panel + rotate chevron
  useEffect(() => {
    if (!panelEl || !chevronEl) return;
    panelEl.style.display = open ? "block" : "none";
    chevronEl.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
    chevronEl.style.transition = "transform 0.2s";
  }, [open, panelEl, chevronEl]);

  const userHasReviewed = user
    ? reviews.some((r) => r.user_id === user.id)
    : false;

  if (!domReady || !panelEl) return null;

  return createPortal(
    <div
      style={{
        paddingTop: 10,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <ReviewList reviews={reviews} />
      <div
        style={{
          borderTop: reviews.length ? "1px solid #1e1e1e" : "none",
          paddingTop: reviews.length ? 8 : 0,
        }}
      >
        {user ? (
          userHasReviewed ? (
            <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
              You've already reviewed this coupon.
            </p>
          ) : (
            <ReviewForm couponId={couponId} onSubmitted={fetchReviews} />
          )
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 12,
              color: "#666",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "#89E900";
              e.currentTarget.style.color = "#89E900";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#666";
            }}
          >
            Login to write a review
          </button>
        )}
      </div>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </div>,
    panelEl,
  );
}
