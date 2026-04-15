// src/components/reviews/CouponReviews.jsx
import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { userStore } from "../../stores/authStore";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import LoginModal from "../auth/LoginModal";

const API = import.meta.env.PUBLIC_API_BASE_URL;

function Stars({ rating }) {
  return <span style={{ color: "#89E900", fontSize: "13px" }}>⭐ {rating}</span>;
}

export default function CouponReviews({
  couponId,
  initialReviews = null,
  initialAggregate = null,
}) {
  const user = useStore(userStore);
  const [reviews, setReviews] = useState(initialReviews || []);
  const [aggregate, setAggregate] = useState(
    initialAggregate || { avg_rating: 0, total: 0 }
  );
  const [open, setOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loading, setLoading] = useState(!initialReviews);

  async function fetchReviews() {
    try {
      const res = await fetch(`${API}/reviews/${couponId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setAggregate(data.aggregate || { avg_rating: 0, total: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialReviews !== null) return;
    fetchReviews();
  }, [couponId]);

  const userHasReviewed = user
    ? reviews.some((r) => r.user_id === user.id)
    : false;

  return (
    <div style={{ borderTop: "1px solid #2a2a2a", marginTop: 8, paddingTop: 8 }}>
      {/* Clickable Summary Row */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: "12px", color: "#aaa" }}>
          {loading ? (
            "Loading reviews..."
          ) : aggregate.total > 0 ? (
            <>
              <Stars rating={aggregate.avg_rating} />{" "}
              {aggregate.total} coupon hunter{aggregate.total > 1 ? "s" : ""} reviewed
            </>
          ) : (
            "✍️ No reviews yet — be the first!"
          )}
        </span>
        <span
          style={{
            fontSize: "11px",
            color: "#555",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </div>

      {/* Expandable Content */}
      {open && (
        <div style={{ paddingTop: 12 }}>
          <ReviewList reviews={reviews} />
          <div style={{ marginTop: reviews.length ? 12 : 0, paddingTop: reviews.length ? 8 : 0, borderTop: reviews.length ? "1px solid #1e1e1e" : "none" }}>
            {user ? (
              userHasReviewed ? (
                <p style={{ fontSize: "13px", color: "#666" }}>
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
                  border: "1px solid #444",
                  color: "#aaa",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  fontSize: "13px",
                }}
              >
                Login to write a review
              </button>
            )}
          </div>
          <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
        </div>
      )}
    </div>
  );
}