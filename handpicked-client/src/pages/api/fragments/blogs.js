// src/pages/api/fragments/blogs.js
import { renderBlogCardHtml } from "../../../lib/renderers/blogCardHtml.js";

const BACKEND_BASE = process.env.PUBLIC_API_BASE_URL.replace(/\/+$/, "");

export async function GET({ url }) {
  try {
    const qs = url.search || "";
    const backendUrl = `${BACKEND_BASE}/blogs${qs}`;
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
    const html = rows.map((r) => renderBlogCardHtml(r)).join("");
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
