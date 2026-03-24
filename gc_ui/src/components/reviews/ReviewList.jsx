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

export default function ReviewList({ reviews }) {
  if (!reviews?.length) return null;

  return (
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
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 3,
              }}
            >
              <span style={{ fontSize: 12, color: "#d0d0d0", fontWeight: 600 }}>
                {r.user.full_name}
              </span>
              <StarRating value={r.rating} size={11} />
              <span style={{ fontSize: 11, color: "#444", marginLeft: "auto" }}>
                {timeAgo(r.created_at)}
              </span>
            </div>
            {r.comment && (
              <p
                style={{
                  fontSize: 12,
                  color: "#777",
                  margin: "0 0 4px",
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
                  alt="Proof screenshot"
                  style={{
                    maxHeight: 80,
                    borderRadius: 4,
                    objectFit: "cover",
                    marginTop: 4,
                  }}
                />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
