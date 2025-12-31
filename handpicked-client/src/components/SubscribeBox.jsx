import React, { useState, useRef, useEffect } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/** shared helper for all pages */
export async function doSubscribe(email, source = null) {
  const val = (email || "").trim().toLowerCase();
  if (!val || !EMAIL_REGEX.test(val)) {
    return { ok: false, message: "Please enter a valid email address." };
  }

  try {
    const base = import.meta.env.PUBLIC_API_BASE_URL || "";
    const endpoint = base + "/subscribe";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: val, source, honeypot: "" }),
    });

    if (res.status === 429) {
      return {
        ok: false,
        message: "Too many requests. Please try again later.",
      };
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      const msg = data?.message || "Subscription failed. Try again.";
      return { ok: false, message: msg, data };
    }

    return { ok: true, message: "Subscribed — thank you!", data };
  } catch (err) {
    console.error("subscribe error:", err);
    return { ok: false, message: "An error occurred. Please try again." };
  }
}

/* -------------------- Component (refined + debounce) -------------------- */
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

  // Debounce: timestamp of last submit
  const lastSubmitTsRef = useRef(0);
  const DEBOUNCE_MS = 2000; // 2 seconds

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (success && inputRef.current) {
      inputRef.current.blur();
    }
  }, [success]);

  const pushToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
  };
  const removeToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // debounce guard: ignore if called again within DEBOUNCE_MS
    const now = Date.now();
    if (now - lastSubmitTsRef.current < DEBOUNCE_MS) {
      // optional: show a subtle toast to indicate rate limit
      pushToast("Please wait a moment before trying again.");
      return;
    }
    lastSubmitTsRef.current = now;

    // basic honeypot check
    if (honeypot) {
      pushToast("Subscribed");
      setEmail("");
      setSuccess(true);
      return;
    }

    if (!EMAIL_REGEX.test((email || "").trim())) {
      setError("Please enter a valid email address.");
      pushToast("Please enter a valid email address.");
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
      <form className="w-full max-w-md" onSubmit={handleSubmit} noValidate>
        <label
          htmlFor="subscribe-email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Get updates
        </label>

        <div className="flex gap-1">
          <input
            id="subscribe-email"
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-indigo-200"
            required
            aria-invalid={!!error}
            aria-describedby={error ? "subscribe-error" : undefined}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? "Please wait…" : "Subscribe"}
          </button>
        </div>

        {/* honeypot hidden field */}
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
          <p
            id="subscribe-error"
            className="text-xs text-red-600 mt-2"
            role="alert"
          >
            {error}
          </p>
        )}

        {success && (
          <p className="text-sm text-green-700 mt-2" role="status">
            Subscribed — thank you!
          </p>
        )}
      </form>

      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </>
  );
}
