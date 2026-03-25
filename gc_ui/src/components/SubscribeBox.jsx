import React, { useState, useRef, useEffect } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

export async function doSubscribe(email, source = null) {
  const val = (email || "").trim().toLowerCase();
  if (!val || !EMAIL_REGEX.test(val))
    return { ok: false, message: "Please enter a valid email address." };
  try {
    const base = import.meta.env.PUBLIC_API_BASE_URL || "";
    const res = await fetch(base + "/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: val, source, honeypot: "" }),
    });
    if (res.status === 429)
      return {
        ok: false,
        message: "Too many requests. Please try again later.",
      };
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok)
      return {
        ok: false,
        message: data?.message || "Subscription failed. Try again.",
      };
    return { ok: true, message: "Subscribed — thank you!", data };
  } catch {
    return { ok: false, message: "An error occurred. Please try again." };
  }
}

function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div role="status" aria-live="polite" className="toast">
      {message}
    </div>
  );
}

export default function SubscribeBox({ source }) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const mountedRef = useRef(true);
  const inputRef = useRef(null);
  const lastSubmitTsRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  useEffect(() => {
    if (success && inputRef.current) inputRef.current.blur();
  }, [success]);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const now = Date.now();
    if (now - lastSubmitTsRef.current < 2000) {
      pushToast("Please wait a moment.");
      return;
    }
    lastSubmitTsRef.current = now;
    if (honeypot) {
      setSuccess(true);
      setEmail("");
      return;
    }
    if (!EMAIL_REGEX.test((email || "").trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      const result = await doSubscribe(email, source);
      if (!result.ok) {
        setError(result.message);
        pushToast(result.message);
        return;
      }
      pushToast(result.message);
      setEmail("");
      setError(null);
      setSuccess(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <>
      <form className="w-full" onSubmit={handleSubmit} noValidate>
        {/* <label
          htmlFor="subscribe-email"
          className="block text-xs font-semibold uppercase tracking-widest mb-2"
          style={{ color: "#89E900" }}
        >
          Get Updates
        </label> */}
        <div className="flex gap-1.5">
          <input
            id="subscribe-email"
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            aria-invalid={!!error}
            style={{
              background: "#2e2e2e",
              border: "1px solid #333333",
              color: "#F5F5F0",
              borderRadius: "8px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              flex: 1,
              outline: "none",
            }}
          />
          <button
            type="submit"
            className="btn btn-primary text-sm"
            disabled={loading}
            style={{ whiteSpace: "nowrap" }}
          >
            {loading ? "…" : "Subscribe"}
          </button>
        </div>

        <label
          style={{ position: "absolute", left: "-9999px" }}
          aria-hidden="true"
        >
          Do not fill
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            autoComplete="off"
            tabIndex={-1}
            name="hp_field"
          />
        </label>

        {error && (
          <p className="text-xs mt-2" style={{ color: "#f87171" }} role="alert">
            {error}
          </p>
        )}
        {success && (
          <p
            className="text-xs mt-2"
            style={{ color: "#89E900" }}
            role="status"
          >
            ✓ Subscribed — thank you!
          </p>
        )}
      </form>

      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          onClose={() => setToasts((x) => x.filter((i) => i.id !== t.id))}
        />
      ))}
    </>
  );
}
