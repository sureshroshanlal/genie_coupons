import { useState } from "react";
import StarRating from "./StarRating";
import { cdnUrl } from '../../utils/cdnUrl.js';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function Avatar({ name, avatarUrl }) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return avatarUrl ? (
    <img
      src={cdnUrl(avatarUrl)}
      alt={name}
      referrerPolicy="no-referrer"
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: "#2a2a2a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 700,
        color: "#89E900",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

function Lightbox({ url, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={cdnUrl(url)}
        alt="Proof screenshot"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: 6,
          objectFit: "contain",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "absolute",
          top: 16,
          right: 20,
          background: "none",
          border: "none",
          color: "#fff",
          fontSize: 28,
          cursor: "pointer",
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}

export default function ReviewList({ reviews }) {
  const [lightbox, setLightbox] = useState(null);

  if (!reviews?.length) return null;

  return (
    <>
      {lightbox && (
        <Lightbox url={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginBottom: 4,
        }}
      >
        {reviews.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "8px 0",
              borderBottom: "1px solid #1e1e1e",
            }}
          >
            <Avatar name={r.user.full_name} avatarUrl={r.user.avatar_url} />

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 3,
                }}
              >
                <span
                  style={{ fontSize: 12, color: "#d0d0d0", fontWeight: 600 }}
                >
                  {r.user.full_name}
                </span>
                <StarRating value={r.rating} size={11} />
                <span
                  style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}
                >
                  {timeAgo(r.created_at)}
                </span>
              </div>

              {/* Comment + thumbnail row */}
              {(r.comment || r.screenshot_url) && (
                <div
                  style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                  {r.comment && (
                    <p
                      style={{
                        fontSize: 12,
                        color: "#777",
                        margin: 0,
                        lineHeight: 1.6,
                        flex: 1,
                      }}
                    >
                      {r.comment}
                    </p>
                  )}
                  {r.screenshot_url && (
                    <img
                      src={cdnUrl(r.screenshot_url)}
                      alt="Proof screenshot"
                      onClick={() => setLightbox(r.screenshot_url)}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 4,
                        objectFit: "cover",
                        flexShrink: 0,
                        cursor: "pointer",
                        border: "1px solid #2a2a2a",
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
