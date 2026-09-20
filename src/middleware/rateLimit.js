const { rateLimit } = require("express-rate-limit");
const ApiError = require("../utils/ApiError");

// In-memory store: counters are per process. Use a shared store (e.g. Redis) if running multiple instances.
const limiter = ({ windowMs, limit }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new ApiError(429, "Too many requests, please try again later", { code: "RATE_LIMITED" })
      ),
  });

const MINUTE = 60 * 1000;

module.exports = {
  loginLimiter: limiter({ windowMs: 15 * MINUTE, limit: 10 }),
  registerLimiter: limiter({ windowMs: 60 * MINUTE, limit: 5 }),
  refreshLimiter: limiter({ windowMs: 15 * MINUTE, limit: 30 }),
};
