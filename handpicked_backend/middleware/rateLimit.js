import rateLimit from "express-rate-limit";

export const publicRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 req/min/IP
  standardHeaders: true, // adds RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  legacyHeaders: false,
  message: {
    data: null,
    meta: { error: { message: "Too many requests, please try again later." } },
  },
  statusCode: 429,
});
