const jwt = require("jsonwebtoken");
const env = require("../config/env");

const ALGORITHM = "HS256";

const signAccessToken = (user) =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: String(user.id),
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  });

const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });

module.exports = { signAccessToken, verifyAccessToken };
