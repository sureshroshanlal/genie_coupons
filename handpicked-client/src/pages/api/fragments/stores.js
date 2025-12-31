// src/pages/api/fragments/stores.js
import { renderStoreCardHtml } from "../../../lib/renderers/storeCardHtml.js";

const BACKEND_BASE = process.env.PUBLIC_API_BASE_URL.replace(/\/+$/, "");

export async function GET({ url }) {
  try {
    const qs = url.search || "";
    const backendUrl = `${BACKEND_BASE}/stores${qs}`;
    const resp = await fetch(backendUrl, {
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: "backend_error", status: resp.status }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }
    const json = await resp.json();
    const rows = Array.isArray(json.data)
      ? json.data
      : json.rows || json.items || [];
    const itemsHtml = rows.map((r) => renderStoreCardHtml(r)).join("");
    const html = `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">${itemsHtml}</div>`;
    return new Response(JSON.stringify({ html, meta: json.meta || {} }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
