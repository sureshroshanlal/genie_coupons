import StarRating from "./StarRating";

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
      src={avatarUrl}
      alt={name}
      referrerPolicy="no-referrer"
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        background: "#2a2a2a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "#89E900",
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function ReviewList({ reviews }) {
  if (!reviews?.length) {
    return (
      <p style={{ color: "#555", fontSize: 13, margin: "8px 0" }}>
        No reviews yet. Be the first to review!
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {reviews.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: 8,
            padding: "10px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={r.user.full_name} avatarUrl={r.user.avatar_url} />
              <span style={{ fontSize: 13, color: "#d0d0d0", fontWeight: 500 }}>
                {r.user.full_name}
              </span>
              <StarRating value={r.rating} size={13} />
            </div>
            <span style={{ fontSize: 11, color: "#555" }}>
              {timeAgo(r.created_at)}
            </span>
          </div>
          {r.comment && (
            <p
              style={{
                fontSize: 13,
                color: "#888",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {r.comment}
            </p>
          )}
          {r.screenshot_url && (
            <a
              href={r.screenshot_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={r.screenshot_url}
                alt="Review screenshot"
                style={{
                  maxWidth: "100%",
                  maxHeight: 120,
                  borderRadius: 6,
                  objectFit: "cover",
                  marginTop: 4,
                }}
              />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
