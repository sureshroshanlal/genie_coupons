import { useState } from "react";
import StarRating from "./StarRating";

const API = import.meta.env.PUBLIC_API_BASE_URL;
const MAX_COMMENT = 1000;

export default function ReviewForm({ couponId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!rating) {
      setError("Please select a star rating.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/reviews/${couponId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit.");
        return;
      }
      setSuccess(data.message);
      setRating(0);
      setComment("");
      onSubmitted?.();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <p style={{ fontSize: 12, color: "#89E900", margin: "8px 0 4px" }}>
        ✓ {success}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        paddingTop: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#666" }}>Your rating:</span>
        <StarRating value={rating} onChange={setRating} interactive size={18} />
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
        placeholder="Did this coupon work? Share your experience... (optional)"
        rows={2}
        style={{
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 6,
          color: "#f0f0f0",
          fontSize: 12,
          padding: "7px 10px",
          resize: "none",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          lineHeight: 1.6,
        }}
        onFocus={(e) => (e.target.style.borderColor = "#89E900")}
        onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
      />
      {error && (
        <p style={{ color: "#ff5555", fontSize: 12, margin: 0 }}>{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || !rating}
        style={{
          background: "#89E900",
          color: "#111",
          border: "none",
          borderRadius: 6,
          padding: "6px 14px",
          fontSize: 12,
          fontWeight: 700,
          cursor: loading || !rating ? "not-allowed" : "pointer",
          opacity: loading || !rating ? 0.5 : 1,
          alignSelf: "flex-start",
        }}
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
