const prisma = require("../config/db");
const env = require("../config/env");
const { generateToken, sha256 } = require("../utils/crypto");

const DAY_MS = 24 * 60 * 60 * 1000;

// Creates a refresh token row and returns the raw token. Only its SHA-256 hash is stored,
// so a database leak doesn't expose usable tokens.
const issueRefreshToken = async ({ userId, familyId, meta = {} }, db = prisma) => {
  const raw = generateToken();

  const record = await db.refreshToken.create({
    data: {
      userId,
      familyId,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * DAY_MS),
      userAgent: meta.userAgent?.slice(0, 255),
      ip: meta.ip,
    },
  });

  return { raw, record };
};

const findByRawToken = (raw) =>
  prisma.refreshToken.findUnique({ where: { tokenHash: sha256(raw) } });

const revokeFamily = (familyId, db = prisma) =>
  db.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

const revokeAllForUser = (userId, db = prisma) =>
  db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

// Revoked tokens are kept until they expire so reuse can still be detected.
const pruneExpired = (userId) =>
  prisma.refreshToken.deleteMany({ where: { userId, expiresAt: { lt: new Date() } } });

module.exports = {
  issueRefreshToken,
  findByRawToken,
  revokeFamily,
  revokeAllForUser,
  pruneExpired,
};
