// src/controllers/subscribe.js
import { supabase } from "../dbhelper/dbclient.js";

/**
 * POST /api/subscribe
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 min
const MAX_REQUESTS_PER_WINDOW = 10; // per IP

export async function subscribe(req, res) {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
    // --- Simple in-memory rate limiter (replace with Redis in production) ---
    if (!global.__subscribeRate) global.__subscribeRate = new Map();
    const now = Date.now();
    const entry = global.__subscribeRate.get(ip) || { count: 0, firstTs: now };
    if (now - entry.firstTs > RATE_LIMIT_WINDOW_MS) {
      entry.count = 0;
      entry.firstTs = now;
    }
    entry.count += 1;
    global.__subscribeRate.set(ip, entry);
    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      return res
        .status(429)
        .json({
          ok: false,
          message: "Too many requests, please try again later",
        });
    }
    // ---------------------------------------------------------------------

    const { email, source, honeypot } = req.body || {};

    // Honeypot: must be empty (bots often fill this)
    if (honeypot) {
      // Silent success to confuse bots
      return res.status(200).json({ ok: true, message: "Subscribed" });
    }

    if (
      !email ||
      typeof email !== "string" ||
      !EMAIL_REGEX.test(email.trim())
    ) {
      return res.status(400).json({ ok: false, message: "Invalid email" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Upsert into subscriptions table to avoid duplicates (supabase upsert)
    // Table schema expected: subscriptions (id, email, source, created_at)
    try {
      const payload = {
        email: normalizedEmail,
        source: source || null,
        ip: ip,
        created_at: new Date().toISOString(),
      };

      // Use upsert to avoid duplicate emails; assume 'email' has unique constraint
      const { data, error } = await supabase
        .from("subscriptions")
        .upsert([payload], { onConflict: ["email"], returning: "minimal" });

      if (error) {
        console.error("subscribe: supabase upsert error:", error);
        // If unique constraint fails or other DB issue, still return 200 (soft fail) or 500?
        // We'll return 500 to surface backend issues during dev, but you can change to 200 for silent handling.
        return res
          .status(500)
          .json({ ok: false, message: "Failed to save subscription" });
      }

      return res.status(200).json({ ok: true, message: "Subscribed" });
    } catch (dbErr) {
      console.error("subscribe: db error:", dbErr);
      return res.status(500).json({ ok: false, message: "Server error" });
    }
  } catch (err) {
    console.error("subscribe controller error:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
