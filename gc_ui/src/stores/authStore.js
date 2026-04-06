// src/stores/authStore.js
let state = {
  user: null,
  loading: true,
};

const listeners = new Set();
let mePromise = null;
const API = import.meta.env.PUBLIC_API_BASE_URL;

function emit() {
  for (const listener of listeners) listener(state);
}

export function subscribeAuth(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getAuthState() {
  return state;
}

export async function refreshAuth() {
  if (mePromise) return mePromise;

  mePromise = (async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        state = { user: data.user ?? null, loading: false };
      } else {
        state = { user: null, loading: false };
      }
    } catch {
      state = { user: null, loading: false };
    } finally {
      mePromise = null;
      emit();
    }

    return state.user;
  })();

  return mePromise;
}

export function setAuthUser(user) {
  state = { user, loading: false };
  emit();
}

export function clearAuthUser() {
  state = { user: null, loading: false };
  emit();
}
