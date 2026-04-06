import { createContext, useContext, useEffect, useState } from "react";

import {
  subscribeAuth,
  getAuthState,
  refreshAuth,
  setAuthUser,
  clearAuthUser,
} from "../stores/authStore";

const AuthContext = createContext(null);

const API = import.meta.env.PUBLIC_API_BASE_URL;

// shared promise (prevents duplicate /auth/me calls)
let mePromise = null;

export function AuthProvider({ children }) {
  // const [user, setUser] = useState(null);
  // const [loading, setLoading] = useState(true);

  const [auth, setAuth] = useState(getAuthState());

  useEffect(() => {
    const unsubscribe = subscribeAuth(setAuth);
    refreshAuth();
    return unsubscribe;
  }, []);

  function resetAuthCache() {
    mePromise = null;
  }

  async function loginWithEmail(email, password) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    setAuthUser(data.user ?? null);
    window.dispatchEvent(new CustomEvent("auth:changed"));
    return data.user;
  }

  async function signupWithEmail(email, password, full_name) {
    const res = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, full_name }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Signup failed");

    return data.message;
  }

  function loginWithGoogle() {
    window.location.href = `${API}/auth/google`;
  }

  async function logout() {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      resetAuthCache();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        loading: auth.loading,
        loginWithEmail,
        signupWithEmail,
        loginWithGoogle,
        logout,
        refreshUser: refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
