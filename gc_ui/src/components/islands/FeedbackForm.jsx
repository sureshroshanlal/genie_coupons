import { useState } from "react";

export default function FeedbackForm({ storeSlug }) {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setSuccess(false);
    setErrorMsg(null);
    try {
      const base = import.meta.env.PUBLIC_API_BASE_URL || "";
      const res = await fetch(`${base}/stores/${storeSlug}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email?.trim() || null,
          message: form.message.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error)
        throw new Error(json?.error?.message || "Submission failed");
      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-sm placeholder-[#707068] focus:outline-none transition";

  return (
    <div className="card-base p-4">
      {/* Header */}
      <div
        className="flex items-center gap-2 mb-4 pb-3"
        style={{ borderBottom: "1px solid #333333" }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(137,233,0,0.15)" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            aria-hidden="true"
            fill="none"
            stroke="#89E900"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 3H3a2 2 0 00-2 2v13a2 2 0 002 2h4l4 4 4-4h6a2 2 0 002-2V5a2 2 0 00-2-2z"
            />
          </svg>
        </div>
        <div>
          <div
            className="text-sm font-bold leading-tight"
            style={{ color: "#F5F5F0" }}
          >
            Leave Feedback
          </div>
          <div
            className="text-xs uppercase tracking-wider"
            style={{ color: "#707068" }}
          >
            We read every message
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="name"
          placeholder="Your Name"
          required
          value={form.name}
          onChange={handleChange}
          className={inputClass}
          style={{
            background: "#2e2e2e",
            border: "1px solid #333333",
            color: "#F5F5F0",
          }}
        />
        <input
          name="email"
          type="email"
          placeholder="Your Email (optional)"
          value={form.email}
          onChange={handleChange}
          className={inputClass}
          style={{
            background: "#2e2e2e",
            border: "1px solid #333333",
            color: "#F5F5F0",
          }}
        />
        <textarea
          name="message"
          placeholder="Your message..."
          required
          rows={4}
          value={form.message}
          onChange={handleChange}
          className={`${inputClass} resize-none`}
          style={{
            background: "#2e2e2e",
            border: "1px solid #333333",
            color: "#F5F5F0",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-bold transition disabled:opacity-60"
          style={{
            background: loading
              ? "#2d5200"
              : "linear-gradient(135deg, #2d5200, #89E900)",
            color: "#181818",
          }}
        >
          {loading ? "Submitting…" : "Submit Feedback"}
        </button>

        {success && (
          <div
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              background: "rgba(137,233,0,0.1)",
              border: "1px solid rgba(137,233,0,0.3)",
              color: "#89E900",
            }}
          >
            ✓ Thank you for your feedback!
          </div>
        )}
        {errorMsg && (
          <div
            className="rounded-lg px-3 py-2 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "#f87171",
            }}
          >
            {errorMsg}
          </div>
        )}
      </form>
    </div>
  );
}
