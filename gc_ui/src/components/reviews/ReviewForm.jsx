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
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit review.");
        return;
      }

      setSuccess(data.message);
      setRating(0);
      setComment("");
      onSubmitted?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 13, color: "#888" }}>Your rating:</span>
        <StarRating value={rating} onChange={setRating} interactive size={20} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
        placeholder="Did this coupon work? Share your experience... (optional)"
        rows={3}
        style={{
          background: "#111",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#f0f0f0",
          fontSize: 13,
          padding: "8px 10px",
          resize: "vertical",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
          lineHeight: 1.6,
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#89E900")}
        onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
      />
      <div
        style={{
          fontSize: 11,
          color: "#444",
          textAlign: "right",
          marginTop: -6,
        }}
      >
        {comment.length}/{MAX_COMMENT}
      </div>

      {error && (
        <p style={{ color: "#ff5555", fontSize: 13, margin: 0 }}>{error}</p>
      )}
      {success && (
        <p style={{ color: "#89E900", fontSize: 13, margin: 0 }}>{success}</p>
      )}

      {!success && (
        <button
          type="submit"
          disabled={loading || !rating}
          style={{
            background: "#89E900",
            color: "#111",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: loading || !rating ? "not-allowed" : "pointer",
            opacity: loading || !rating ? 0.6 : 1,
            alignSelf: "flex-start",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      )}
    </form>
  );
}
