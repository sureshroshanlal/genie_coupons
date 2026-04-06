// src/components/reviews/CouponReviews.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import LoginModal from "../auth/LoginModal";
import { cdnUrl } from "../../utils/cdnUrl.js";

const API = import.meta.env.PUBLIC_API_BASE_URL;

function Stars({ rating }) {
  return (
    <span style={{ color: "#89E900", fontSize: 11 }}>
      {"⭐"} {rating}
    </span>
  );
}

function Summary({ aggregate, reviews }) {
  if (aggregate.total === 0) {
    return (
      <span style={{ color: "#f7f7e8", fontSize: 12 }}>
        ✍️ No reviews yet — yours could be the first!
      </span>
    );
  }

  const top3 = reviews.slice(0, 3);
  const avatarSize = 20;
  const overlap = 6;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      {/* Avatars */}
      <span
        style={{
          position: "relative",
          display: "inline-block",
          width: avatarSize + (top3.length - 1) * (avatarSize - overlap),
          height: avatarSize,
          flexShrink: 0,
        }}
      >
        {top3.map((r, i) => {
          const name = r.user?.full_name || "?";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const left = i * (avatarSize - overlap);
          const base = {
            position: "absolute",
            left,
            top: 0,
            width: avatarSize,
            height: avatarSize,
            borderRadius: "50%",
            border: "1.5px solid #181818",
            objectFit: "cover",
          };
          return r.user?.avatar_url ? (
            <img
              key={i}
              src={cdnUrl(r.user.avatar_url)}
              referrerPolicy="no-referrer"
              alt={initials}
              style={base}
            />
          ) : (
            <span
              key={i}
              style={{
                ...base,
                background: "#2a2a2a",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 7,
                fontWeight: 700,
                color: "#89E900",
              }}
            >
              {initials}
            </span>
          );
        })}
      </span>
      {/* Rating + count */}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Stars rating={aggregate.avg_rating} />
        <span style={{ color: "#f7f7e8", fontSize: 12 }}>
          {aggregate.total}{" "}
          {aggregate.total === 1
            ? "coupon hunter reviewed this"
            : "coupon hunters reviewed this"}
        </span>
      </span>
    </span>
  );
}

function CouponReviewsInner({
  couponId,
  initialReviews = null,
  initialAggregate = null,
}) {
  const { user, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState(initialReviews || []);
  const [aggregate, setAggregate] = useState(
    initialAggregate || { avg_rating: 0, total: 0 },
  );
  const [loading, setLoading] = useState(initialReviews === null);
  const [open, setOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isLoading = authLoading || loading;

  async function fetchReviews() {
    try {
      const res = await fetch(`${API}/reviews/${couponId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setAggregate(data.aggregate || { avg_rating: 0, total: 0 });
    } catch (err) {
      console.warn("fetchReviews failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialReviews !== null) return;
    if (couponId) fetchReviews();
  }, [couponId]);

  const userHasReviewed = user
    ? reviews.some((r) => r.user_id === user.id)
    : false;

  return (
    <div
      style={{ borderTop: "1px solid #2a2a2a", marginTop: 8, paddingTop: 8 }}
    >
      {/* Toggle row */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12, color: "#555" }}>
          {loading ? (
            "Loading reviews..."
          ) : (
            <Summary aggregate={aggregate} reviews={reviews} />
          )}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#555",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          ▼
        </span>
      </div>

      {/* Panel */}
      {open && (
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
            {authLoading ? (
              <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                Checking your login...
              </p>
            ) : user ? (
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
        </div>
      )}
    </div>
  );
}

export default function CouponReviews(props) {
  return <CouponReviewsInner {...props} />;
}
