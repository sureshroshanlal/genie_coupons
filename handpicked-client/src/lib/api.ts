// api.ts
const API_BASE_URL = process?.env?.PUBLIC_API_BASE_URL as string;

async function fetchJson<T>(
  path: string,
  init: RequestInit = {},
  options: { retries?: number; timeout?: number; storeSlug?: string } = {}
): Promise<T> {
  const { retries = 2, timeout = 10000, storeSlug } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...(storeSlug ? { "x-store-slug": storeSlug } : {}),
          ...(init.headers || {}),
        },
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(id);

      if (!res.ok)
        throw new Error(`API ${path} failed with status ${res.status}`);

      return (await res.json()) as T;
    } catch (err) {
      clearTimeout(id);
      if (attempt < retries) {
        console.warn(`Retrying ${path}, attempt ${attempt + 1}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(`API ${path} failed after ${retries + 1} attempts`);
}

export const api = {
  get: <T>(
    path: string,
    init: RequestInit = {},
    opts?: { retries?: number; timeout?: number; storeSlug?: string }
  ) => fetchJson<T>(path, init, opts),
};
