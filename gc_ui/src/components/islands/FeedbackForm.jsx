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
      if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || "Submission failed");
      }

      setSuccess(true);
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      setErrorMsg(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition";

  return (
    <div className="card-base p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 flex-shrink-0"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="12" fill="#4f46e5" />
          <path
            fill="white"
            d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
          />
        </svg>
        <div>
          <div className="text-sm font-bold text-gray-900 leading-tight">
            Leave Feedback
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
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
        />

        <input
          name="email"
          type="email"
          placeholder="Your Email (optional)"
          value={form.email}
          onChange={handleChange}
          className={inputClass}
        />

        <textarea
          name="message"
          placeholder="Your message..."
          required
          rows={4}
          value={form.message}
          onChange={handleChange}
          className={`${inputClass} resize-none`}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#334155,#4f46e5)" }}
        >
          {loading ? "Submitting…" : "Submit Feedback"}
        </button>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
            Thank you for your feedback!
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
            {errorMsg}
          </div>
        )}
      </form>
    </div>
  );
}
