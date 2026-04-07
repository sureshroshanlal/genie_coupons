import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

/**
 * LoginModal
 * Props:
 *   isOpen (bool)
 *   onClose (fn)
 *   defaultTab ("login" | "signup")  — optional, defaults to "login"
 */
export default function LoginModal({ isOpen, onClose, defaultTab = "login" }) {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();

  const [tab, setTab] = useState(() => defaultTab);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
    setMessage("");
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await loginWithEmail(form.email, form.password);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const msg = await signupWithEmail(
        form.email,
        form.password,
        form.full_name,
      );
      setMessage(msg);
      setForm({ email: "", password: "", full_name: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="gc-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Login"
    >
      <div className="gc-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close */}
        <button
          className="gc-modal__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Logo */}
        <div className="gc-modal__logo">
          <img src="/genie_coupon_logo.webp" alt="Genie Coupon" height="36" />
        </div>

        {/* Tabs */}
        <div className="gc-modal__tabs">
          <button
            className={`gc-modal__tab ${tab === "login" ? "gc-modal__tab--active" : ""}`}
            onClick={() => {
              setTab("login");
              setError("");
              setMessage("");
            }}
          >
            Log In
          </button>
          <button
            className={`gc-modal__tab ${tab === "signup" ? "gc-modal__tab--active" : ""}`}
            onClick={() => {
              setTab("signup");
              setError("");
              setMessage("");
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Google */}
        <button
          className="gc-btn-google"
          onClick={loginWithGoogle}
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="gc-modal__divider">
          <span>or</span>
        </div>

        {/* Login form */}
        {tab === "login" && (
          <form onSubmit={handleLogin} noValidate>
            <div className="gc-form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="gc-form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            {error && <p className="gc-form-error">{error}</p>}
            <button type="submit" className="gc-btn-primary" disabled={loading}>
              {loading ? "Logging in..." : "Log In"}
            </button>
          </form>
        )}

        {/* Signup form */}
        {tab === "signup" && (
          <form onSubmit={handleSignup} noValidate>
            <div className="gc-form-group">
              <label htmlFor="signup-name">Full Name</label>
              <input
                id="signup-name"
                type="text"
                name="full_name"
                value={form.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                autoComplete="name"
              />
            </div>
            <div className="gc-form-group">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="gc-form-group">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                required
                autoComplete="new-password"
              />
            </div>
            {error && <p className="gc-form-error">{error}</p>}
            {message && <p className="gc-form-success">{message}</p>}
            <button type="submit" className="gc-btn-primary" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .gc-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .gc-modal {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 12px;
          padding: 32px 28px;
          width: 100%;
          max-width: 400px;
          position: relative;
        }
        .gc-modal__close {
          position: absolute;
          top: 14px;
          right: 14px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }
        .gc-modal__close:hover { color: #f0f0f0; }
        .gc-modal__logo {
          text-align: center;
          margin-bottom: 20px;
        }
        .gc-modal__logo img { height: 36px; width: auto; }
        .gc-modal__tabs {
          display: flex;
          border-bottom: 1px solid #2a2a2a;
          margin-bottom: 20px;
        }
        .gc-modal__tab {
          flex: 1;
          background: none;
          border: none;
          color: #666;
          font-size: 14px;
          padding: 10px;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .gc-modal__tab--active {
          color: #89E900;
          border-bottom-color: #89E900;
        }
        .gc-btn-google {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: #fff;
          color: #333;
          border: none;
          border-radius: 8px;
          padding: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .gc-btn-google:hover { background: #f5f5f5; }
        .gc-modal__divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 16px 0;
          color: #444;
          font-size: 12px;
        }
        .gc-modal__divider::before,
        .gc-modal__divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: #2a2a2a;
        }
        .gc-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .gc-form-group label {
          font-size: 13px;
          color: #aaa;
        }
        .gc-form-group input {
          background: #111;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #f0f0f0;
          font-size: 14px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s;
        }
        .gc-form-group input:focus { border-color: #89E900; }
        .gc-form-group input::placeholder { color: #444; }
        .gc-form-error {
          color: #ff5555;
          font-size: 13px;
          margin: 0 0 12px;
        }
        .gc-form-success {
          color: #89E900;
          font-size: 13px;
          margin: 0 0 12px;
        }
        .gc-btn-primary {
          width: 100%;
          background: #89E900;
          color: #111;
          border: none;
          border-radius: 8px;
          padding: 11px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s;
          margin-top: 4px;
        }
        .gc-btn-primary:hover:not(:disabled) { background: #7ad000; }
        .gc-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
