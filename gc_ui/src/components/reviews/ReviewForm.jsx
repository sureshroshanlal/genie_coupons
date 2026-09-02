import { useState, useRef } from "react";
import StarRating from "./StarRating";

const API = import.meta.env.PUBLIC_API_BASE_URL;
const MAX_COMMENT = 1000;

export default function ReviewForm({ couponId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be under 5MB.");
      return;
    }
    setScreenshot(file);
    setPreview(URL.createObjectURL(file));
    setError("");
  }

  function removeScreenshot() {
    setScreenshot(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

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
      let screenshotUrl = null;

      // Upload screenshot first if present
      if (screenshot) {
        setUploading(true);
        const formData = new FormData();
        formData.append("screenshot", screenshot);
        const upRes = await fetch(`${API}/reviews/upload-screenshot`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        setUploading(false);
        const upData = await upRes.json();
        if (!upRes.ok) {
          setError(upData.error || "Screenshot upload failed.");
          setLoading(false);
          return;
        }
        screenshotUrl = upData.url;
      }

      const res = await fetch(`${API}/reviews/${couponId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
          screenshot_url: screenshotUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit.");
        return;
      }
      setSuccess(data.message);
      setRating(0);
      setComment("");
      setScreenshot(null);
      setPreview(null);
      onSubmitted?.();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
      setUploading(false);
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

      {/* Screenshot upload */}
      {preview ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <img
            src={preview}
            alt="Preview"
            style={{ maxHeight: 80, borderRadius: 6, objectFit: "cover" }}
          />
          <button
            type="button"
            onClick={removeScreenshot}
            style={{
              position: "absolute",
              top: -6,
              right: -6,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#ff5555",
              border: "none",
              color: "#fff",
              fontSize: 11,
              cursor: "pointer",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id={`screenshot-upload-${couponId}`}
          />
          <label
            htmlFor={`screenshot-upload-${couponId}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: "1px dashed #2a2a2a",
              borderRadius: 6,
              padding: "5px 10px",
              fontSize: 12,
              color: "#9ca3af",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "#89E900";
              e.currentTarget.style.color = "#89E900";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "#2a2a2a";
              e.currentTarget.style.color = "#9ca3af";
            }}
          >
            📎 Attach screenshot (optional)
          </label>
        </div>
      )}

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
        {uploading
          ? "Uploading..."
          : loading
            ? "Submitting..."
            : "Submit Review"}
      </button>
    </form>
  );
}
