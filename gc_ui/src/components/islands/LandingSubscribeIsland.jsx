import React, { useState } from "react";

/*
  NOTE: doSubscribe is lazy-imported on demand so the island bundle stays small.
  In your Astro template, render this island with client:idle or client:visible.
*/

export default function LandingSubscribeIsland() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // local reference to lazily imported function
  let doSubscribeFn = null;

  const loadSubscribe = async () => {
    if (doSubscribeFn) return doSubscribeFn;
    try {
      const mod = await import("../SubscribeBox.jsx");
      doSubscribeFn = mod.doSubscribe;
      return doSubscribeFn;
    } catch (err) {
      console.error("Failed to load subscribe module", err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError("Please enter an email address.");
      return;
    }

    setLoading(true);
    try {
      const doSubscribe = await loadSubscribe();
      const result = await doSubscribe(email, "homepage");
      if (result?.ok) {
        setSuccess(result.message || "Subscribed!");
        setEmail("");
      } else {
        setError(result?.message || "Subscription failed. Try again.");
      }
    } catch (err) {
      setError("Subscription failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 max-w-xl mx-auto">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2"
        noValidate
      >
        <label htmlFor="landing-subscribe-email" className="sr-only">
          Email address
        </label>
        <input
          id="landing-subscribe-email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-2 ring-primary focus:border-primary"
          autoComplete="email"
          aria-describedby="subscribe-msg"
        />

        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="btn btn-outline px-4 py-2 min-w-[96px] touch-manipulation"
        >
          {loading ? "Please wait…" : "Subscribe"}
        </button>
      </form>

      {/* Announcements for screen readers */}
      <div
        id="subscribe-msg"
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {error ? `Error: ${error}` : success ? `Success: ${success}` : ""}
      </div>

      {/* Visible messages for sighted users */}
      {error && (
        <p className="text-xs text-red-600 mt-2" aria-hidden="false">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-green-600 mt-2" aria-hidden="false">
          {success}
        </p>
      )}
    </div>
  );
}
