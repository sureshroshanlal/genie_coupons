let authPromise;

export function getAuth() {
  if (!authPromise) {
    authPromise = fetch("/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .catch(() => null);
  }
  return authPromise;
}
