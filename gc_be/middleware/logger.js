export function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();

  // Optional: attach a simple request id
  req.id = req.id || Math.random().toString(36).slice(2, 10);

  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationMs = Math.round(durationNs / 1e6);
    const log = {
      level: "info",
      ts: new Date().toISOString(),
      req_id: req.id,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      duration_ms: durationMs,
      content_length: res.getHeader("content-length") || null,
      ip: req.ip,
      ua: req.headers["user-agent"] || null,
    };
    console.log(JSON.stringify(log));
  });

  next();
}
