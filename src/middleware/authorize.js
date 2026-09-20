const ApiError = require("../utils/ApiError");

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

// Must run after authenticate().
const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden();
    }
    next();
  };

const isAdmin = (user) => Boolean(user) && ADMIN_ROLES.includes(user.role);

module.exports = { ADMIN_ROLES, requireRole, isAdmin };
