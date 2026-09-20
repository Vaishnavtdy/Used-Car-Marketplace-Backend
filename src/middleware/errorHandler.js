const { ZodError } = require("zod");
const { MulterError } = require("multer");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");

const send = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: "Image is too large",
  LIMIT_FILE_COUNT: "Too many files",
  LIMIT_UNEXPECTED_FILE: "Unexpected file field, or more than 10 files in one request",
};

const errorHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    return send(res, err.statusCode, err.message, {
      ...(err.code && { code: err.code }),
      ...(err.details && { errors: err.details }),
    });
  }

  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    return send(res, 422, "Validation failed", { code: "VALIDATION_ERROR", errors });
  }

  if (err instanceof MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 422;
    return send(res, status, MULTER_MESSAGES[err.code] || "Invalid upload", {
      code: "UPLOAD_ERROR",
    });
  }

  // Prisma known request errors
  if (err.code === "P2002") {
    return send(res, 409, "A record with these details already exists", { code: "CONFLICT" });
  }
  if (err.code === "P2025") {
    return send(res, 404, "Resource not found");
  }

  // Errors raised by body-parser (malformed JSON, payload too large, ...)
  if (err.type === "entity.parse.failed") {
    return send(res, 400, "Malformed JSON body");
  }
  if (err.type === "entity.too.large") {
    return send(res, 413, "Request body too large");
  }

  console.error(err);

  const message =
    env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";
  return send(res, 500, message);
};

module.exports = errorHandler;
