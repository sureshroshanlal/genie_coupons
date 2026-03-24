import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Validates the JWT from the httpOnly cookie.
 * Attaches `req.user` on success.
 * Returns 401 on missing or invalid token.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.gc_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    req.user = data.user;
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

/**
 * Soft auth — attaches req.user if token present and valid,
 * but does not block the request if not authenticated.
 * Use on routes where auth is optional.
 */
export async function softAuth(req, res, next) {
  try {
    const token = req.cookies?.gc_token;
    if (!token) return next();

    const { data } = await supabase.auth.getUser(token);
    if (data?.user) req.user = data.user;
    next();
  } catch {
    next();
  }
}