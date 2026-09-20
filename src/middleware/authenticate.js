const jwt = require("jsonwebtoken");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/jwt");

// Verifies the bearer access token, then loads the user so that deactivation and role changes
// take effect immediately instead of when the token expires. The role always comes from the DB.
//
// Options:
//   allowPasswordChange - accounts flagged mustChangePassword are blocked unless the route opts in
//                         (used by /me, /change-password and logout-all).
//   optional            - requests without an Authorization header continue anonymously
//                         (req.user is undefined); a present but invalid token is still rejected.
const authenticate =
  ({ allowPasswordChange = false, optional = false } = {}) =>
  async (req, res, next) => {
    const header = req.headers.authorization;

    if (!header && optional) return next();

    const [scheme, token] = (header || "").split(" ");

    if (scheme !== "Bearer" || !token) {
      throw ApiError.unauthorized("Authentication required", { code: "AUTH_REQUIRED" });
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized("Access token expired", { code: "TOKEN_EXPIRED" });
      }
      throw ApiError.unauthorized("Invalid access token", { code: "INVALID_TOKEN" });
    }

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("Invalid access token", { code: "INVALID_TOKEN" });
    }

    // A password change/reset invalidates access tokens issued before it (iat is in seconds).
    if (
      user.passwordChangedAt &&
      payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)
    ) {
      throw ApiError.unauthorized("Invalid access token", { code: "INVALID_TOKEN" });
    }

    if (user.mustChangePassword && !allowPasswordChange) {
      throw ApiError.forbidden("You must change your password before continuing", {
        code: "PASSWORD_CHANGE_REQUIRED",
      });
    }

    const { passwordChangedAt: _passwordChangedAt, ...safeUser } = user;
    req.user = safeUser;
    next();
  };

module.exports = authenticate;
