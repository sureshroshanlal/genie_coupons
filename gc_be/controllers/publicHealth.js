import { ok } from "../utils/http.js";
import { supabase } from "../dbhelper/dbclient.js";

function nowIso() {
  return new Date().toISOString();
}

// Check Supabase connectivity with a minimal query
async function checkDb() {
  try {
    // Minimal round-trip: select 1 row to ensure connectivity
    const { error } = await supabase
      .from("coupons")
      .select("id", { head: true, count: "exact" })
      .limit(1);

    if (error) throw error;
    return { status: "ok" };
  } catch (err) {
    console.error("[Health] DB check failed:", err.message || err);
    return { status: "down" };
  }
}

// Placeholder cache check (non-blocking)
async function checkCache() {
  try {
    // If you add a cache backend, replace with proper check
    return { status: "n/a" };
  } catch (err) {
    console.error("[Health] Cache check failed:", err.message || err);
    return { status: "down" };
  }
}

// Health endpoint
export async function health(req, res) {
  try {
    // Run both checks in parallel
    const [db, cache] = await Promise.all([checkDb(), checkCache()]);

    const healthy = db.status === "ok";

    if (!healthy) {
      // Generic 503 if DB is down
      return res.status(503).json({
        data: null,
        meta: { error: { message: "Unhealthy" }, generated_at: nowIso() },
      });
    }

    // Render-safe 200 response
    return ok(res, {
      data: {
        status: "ok",
        version: process.env.APP_VERSION || "dev",
        checks: {
          db: db.status,
          cache: cache.status,
        },
        generated_at: nowIso(),
      },
      meta: {},
    });
  } catch (err) {
    console.error("[Health] Unexpected error:", err.message || err);
    // Catch-all 503
    return res.status(503).json({
      data: null,
      meta: { error: { message: "Unhealthy" }, generated_at: nowIso() },
    });
  }
}
