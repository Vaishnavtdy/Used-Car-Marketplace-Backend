class ApiError extends Error {
  constructor(statusCode, message, { code, details } = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message, opts) {
    return new ApiError(400, message, opts);
  }

  static unauthorized(message = "Authentication required", opts) {
    return new ApiError(401, message, opts);
  }

  static forbidden(message = "You do not have permission to perform this action", opts) {
    return new ApiError(403, message, opts);
  }

  static notFound(message = "Resource not found", opts) {
    return new ApiError(404, message, opts);
  }

  static conflict(message, opts) {
    return new ApiError(409, message, opts);
  }
}

module.exports = ApiError;
