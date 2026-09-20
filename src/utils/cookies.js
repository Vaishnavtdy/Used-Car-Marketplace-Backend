const env = require("../config/env");

const COOKIE_NAME = "refresh_token";

// Scoped to the auth routes so the refresh token isn't sent with every API request.
const baseOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api/auth",
};

const setRefreshCookie = (res, token) =>
  res.cookie(COOKIE_NAME, token, {
    ...baseOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });

const clearRefreshCookie = (res) => res.clearCookie(COOKIE_NAME, baseOptions);

const getRefreshCookie = (req) => req.cookies?.[COOKIE_NAME];

module.exports = { setRefreshCookie, clearRefreshCookie, getRefreshCookie };
