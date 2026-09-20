const authService = require("../services/auth.service");
const userService = require("../services/user.service");
const { setRefreshCookie, clearRefreshCookie, getRefreshCookie } = require("../utils/cookies");
const response = require("../utils/response");

const requestMeta = (req) => ({ ip: req.ip, userAgent: req.get("user-agent") });

const sendSession = (res, session) => {
  setRefreshCookie(res, session.refreshToken);
  response.ok(res, {
    user: session.user,
    accessToken: session.accessToken,
    expiresIn: session.expiresIn,
  });
};

const register = async (req, res) => {
  const user = await authService.register(req.validated.body);
  response.created(res, user);
};

const login = async (req, res) => {
  const session = await authService.login(req.validated.body, requestMeta(req));
  sendSession(res, session);
};

const refresh = async (req, res) => {
  try {
    const session = await authService.refresh(getRefreshCookie(req), requestMeta(req));
    sendSession(res, session);
  } catch (err) {
    clearRefreshCookie(res);
    throw err;
  }
};

const logout = async (req, res) => {
  await authService.logout(getRefreshCookie(req));
  clearRefreshCookie(res);
  response.noContent(res);
};

const logoutAll = async (req, res) => {
  await authService.logoutAll(req.user.id);
  clearRefreshCookie(res);
  response.noContent(res);
};

const me = async (req, res) => {
  response.ok(res, await userService.getById(req.user.id));
};

const changePassword = async (req, res) => {
  await authService.changePassword(req.user.id, req.validated.body);
  // All sessions were revoked, so the client has to log in again.
  clearRefreshCookie(res);
  response.message(res, "Password changed. Please log in again.");
};

module.exports = { register, login, refresh, logout, logoutAll, me, changePassword };
