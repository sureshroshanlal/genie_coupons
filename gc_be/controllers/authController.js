import { supabase } from "../dbhelper/dbclient.js";

const COOKIE_NAME = "gc_token";
const IS_PROD = process.env.NODE_ENV === "production";

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

/**
 * POST /public/v1/auth/login
 * Body: { email, password }
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    res.cookie(COOKIE_NAME, data.session.access_token, COOKIE_OPTIONS);

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
      },
    });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * POST /public/v1/auth/signup
 * Body: { email, password, full_name }
 */
export async function signup(req, res) {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: full_name.trim() },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * GET /public/v1/auth/google
 * Initiates Google OAuth flow
 */
export async function googleLogin(req, res) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.API_URL}/public/v1/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        skipBrowserRedirect: false,
        flowType: "pkce",
      },
    });

    if (error || !data?.url) {
      return res.status(500).json({ error: "Failed to initiate Google login" });
    }

    return res.redirect(data.url);
  } catch {
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

/**
 * GET /public/v1/auth/callback
 * Handles OAuth callback — exchanges code for session
 */
export async function callback(req, res) {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=missing_code`);
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.session) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    res.cookie(COOKIE_NAME, data.session.access_token, COOKIE_OPTIONS);

    return res.redirect(`${process.env.CLIENT_URL}/`);
  } catch {
    return res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
  }
}

/**
 * POST /public/v1/auth/logout
 */
export async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  return res.status(200).json({ message: "Logged out successfully" });
}

/**
 * GET /public/v1/auth/me
 * Returns 200 with user or { user: null } — never 401
 */
export async function me(req, res) {
  try {
    const token = req.cookies?.gc_token;
    if (!token) return res.status(200).json({ user: null });

    const { data } = await supabase.auth.getUser(token);
    if (!data?.user) return res.status(200).json({ user: null });

    return res.status(200).json({
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || null,
        avatar_url: data.user.user_metadata?.avatar_url || null,
      },
    });
  } catch {
    return res.status(200).json({ user: null });
  }
}
