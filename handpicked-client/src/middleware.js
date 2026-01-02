// src/middleware.js
export async function onRequest(ctx, next) {
  const host = ctx.request.headers.get("host") || "";
  const parts = host.split(".");

  if (parts.length > 2) {
    ctx.locals.storeSlug = parts[0];
  }

  return next();
}
