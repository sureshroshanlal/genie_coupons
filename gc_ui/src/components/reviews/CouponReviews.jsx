import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import StarRating from "./StarRating";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import LoginModal from "../auth/LoginModal";

const API = import.meta.env.PUBLIC_API_BASE_URL;

function CouponReviewsInner({ couponId }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [aggregate, setAggregate] = useState({ avg_rating: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

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

  const userHasReviewed = user
    ? reviews.some((r) => r.user_id === user.id)
    : false;

  if (loading) {
    return (
      <div style={{ padding: "12px 0" }}>
        <div
          style={{
            height: 12,
            background: "#2a2a2a",
            borderRadius: 4,
            width: "40%",
            marginBottom: 8,
          }}
        />
        <div
          style={{
            height: 10,
            background: "#2a2a2a",
            borderRadius: 4,
            width: "60%",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        borderTop: "1px solid #2a2a2a",
        marginTop: 12,
        paddingTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Aggregate */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StarRating value={Math.round(aggregate.avg_rating)} size={15} />
        <span style={{ fontSize: 13, color: "#888" }}>
          {aggregate.avg_rating > 0
            ? `${aggregate.avg_rating} / 5 (${aggregate.total} ${aggregate.total === 1 ? "review" : "reviews"})`
            : "No reviews yet"}
        </span>
      </div>

      {/* Review list */}
      <ReviewList reviews={reviews} />

      {/* Submit form or login prompt */}
      <div style={{ borderTop: "1px solid #2a2a2a", paddingTop: 12 }}>
        {user ? (
          userHasReviewed ? (
            <p style={{ fontSize: 13, color: "#555", margin: 0 }}>
              You have already reviewed this coupon.
            </p>
          ) : (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "#888",
                  margin: "0 0 10px",
                  fontWeight: 500,
                }}
              >
                Write a Review
              </p>
              <ReviewForm couponId={couponId} onSubmitted={fetchReviews} />
            </>
          )
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            style={{
              background: "transparent",
              border: "1px solid #2a2a2a",
              borderRadius: 8,
              padding: "8px 14px",
              fontSize: 13,
              color: "#888",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = "#89E900";
              e.target.style.color = "#89E900";
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = "#2a2a2a";
              e.target.style.color = "#888";
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
    </div>
  );
}

export default function CouponReviews({ couponId }) {
  return (
    <AuthProvider>
      <CouponReviewsInner couponId={couponId} />
    </AuthProvider>
  );
}
