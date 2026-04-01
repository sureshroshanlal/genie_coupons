import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import ReviewList from "./ReviewList";
import ReviewForm from "./ReviewForm";
import LoginModal from "../auth/LoginModal";
import { cdnUrl } from '../utils/cdnUrl.js';

const API = import.meta.env.PUBLIC_API_BASE_URL;

function buildSummaryHtml(aggregate, reviews) {
  if (aggregate.total === 0) {
    return `<span style="display:block;width:100%;text-align:center;color:#555;font-size:12px;">✍️ No reviews yet — yours could be the first!</span>`;
  }
  const top3 = reviews.slice(0, 3);
  const avatarSize = 20;
  const overlap = 6;
  const totalWidth = avatarSize + (top3.length - 1) * (avatarSize - overlap);
  const avatarsHtml = `
    <span style="position:relative;display:inline-block;width:${totalWidth}px;height:${avatarSize}px;flex-shrink:0;">
      ${top3
        .map((r, i) => {
          const name = r.user?.full_name || "?";
          const initials = name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
          const left = i * (avatarSize - overlap);
          const base = `position:absolute;left:${left}px;top:0;width:${avatarSize}px;height:${avatarSize}px;border-radius:50%;border:1.5px solid #181818;object-fit:cover;`;
          return r.user?.avatar_url
            ? `<img src="${cdnUrl(r.user.avatar_url)}" referrerpolicy="no-referrer" alt="${initials}" style="${base}" />`
            : `<span style="${base}background:#2a2a2a;display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:700;color:#89E900;">${initials}</span>`;
        })
        .join("")}
    </span>
  `;
  const label =
    aggregate.total === 1
      ? "coupon hunter reviewed this"
      : "coupon hunters reviewed this";
  return `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:7px;width:100%;">
      ${avatarsHtml}
      <span style="display:inline-flex;align-items:center;gap:4px;">
        <span style="color:#89E900;font-size:11px;">⭐</span>
        <span style="color:#888;font-size:12px;">${aggregate.avg_rating} stars · ${aggregate.total} ${label}</span>
      </span>
    </span>
  `;
}

export default function CouponReviews({
  couponId,
  sectionId = "default",
  initialReviews = null,
  initialAggregate = null,
}) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState(initialReviews || []);
  const [aggregate, setAggregate] = useState(
    initialAggregate || { avg_rating: 0, total: 0 },
  );
  const [loading, setLoading] = useState(initialReviews === null);
  const [open, setOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [domReady, setDomReady] = useState(false);
  const [summaryEl, setSummaryEl] = useState(null);
  const [chevronEl, setChevronEl] = useState(null);
  const [panelEl, setPanelEl] = useState(null);
  const [toggleEl, setToggleEl] = useState(null);

  useEffect(() => {
    let attempts = 0;
    const MAX = 20;
    const interval = setInterval(() => {
      const summary = document.getElementById(
        `gc-reviews-summary-${couponId}-${sectionId}`,
      );
      const chevron = document.getElementById(
        `gc-reviews-chevron-${couponId}-${sectionId}`,
      );
      const panel = document.getElementById(
        `gc-reviews-panel-${couponId}-${sectionId}`,
      );
      const toggle = document.getElementById(
        `gc-reviews-toggle-${couponId}-${sectionId}`,
      );
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
  }, [couponId, sectionId]);

  async function fetchReviews() {
    try {
      const res = await fetch(`${API}/reviews/${couponId}`);
      if (!res.ok) return;
      const data = await res.json();
      setReviews(data.reviews || []);
      setAggregate(data.aggregate || { avg_rating: 0, total: 0 });
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialReviews !== null) return;
    if (couponId) fetchReviews();
  }, [couponId]);

  useEffect(() => {
    if (!summaryEl || loading) return;
    summaryEl.innerHTML = buildSummaryHtml(aggregate, reviews);
  }, [loading, aggregate, reviews, summaryEl]);

  useEffect(() => {
    if (!toggleEl || !panelEl || !chevronEl) return;
    const handler = () => setOpen((o) => !o);
    toggleEl.addEventListener("click", handler);
    return () => toggleEl.removeEventListener("click", handler);
  }, [toggleEl, panelEl, chevronEl]);

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
