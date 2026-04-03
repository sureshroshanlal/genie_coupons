import { lazy, Suspense, useState } from "react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { cdnUrl } from "../../utils/cdnUrl.js";

const LoginModal = lazy(() => import("./LoginModal"));

function AuthButton() {
  const { user, loading, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading) {
    return <div class="gc-auth-skeleton" aria-hidden="true" />;
  }

  if (user) {
    const initials = user.full_name
      ? user.full_name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : user.email[0].toUpperCase();

    async function handleLogout() {
      setLoggingOut(true);
      await logout();
      setLoggingOut(false);
    }

    return (
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="gc-avatar-btn"
        title={
          loggingOut
            ? "Logging out..."
            : `Logged in as ${user.full_name || user.email} — click to logout`
        }
        aria-label="Logout"
      >
        {user.avatar_url ? (
          <img
            src={cdnUrl(user.avatar_url)}
            alt={user.full_name || user.email}
            className="gc-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="gc-avatar-initials">{initials}</span>
        )}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="gc-login-btn"
        aria-label="Login or Sign up"
      >
        Login
      </button>
      {showModal && (
        <Suspense fallback={null}>
          <LoginModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  );
}

export default function HeaderAuthIsland() {
  return (
    <AuthProvider>
      <AuthButton />
      <style>{`
        .gc-auth-skeleton {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2a2a2a;
          animation: gc-pulse 1.5s ease-in-out infinite;
        }
        @keyframes gc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .gc-login-btn {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #111;
          background: #89E900;
          border: none;
          border-radius: 999px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s;
          line-height: 1;
        }
        .gc-login-btn:hover { background: #7ad000; }
        .gc-avatar-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid #2a2a2a;
          background: #2a2a2a;
          cursor: pointer;
          padding: 0;
          overflow: hidden;
          transition: border-color 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gc-avatar-btn:hover { border-color: #89E900; }
        .gc-avatar-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gc-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .gc-avatar-initials {
          font-size: 12px;
          font-weight: 700;
          color: #89E900;
          line-height: 1;
        }
      `}</style>
    </AuthProvider>
  );
}
