const prisma = require("../config/db");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { randomUUID } = require("../utils/crypto");
const { hashPassword, verifyPassword, verifyDummyPassword } = require("../utils/password");
const { signAccessToken } = require("../utils/jwt");
const { publicUserSelect } = require("../utils/userSelect");
const tokens = require("./token.service");

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const invalidCredentials = () =>
  ApiError.unauthorized("Invalid email or password", { code: "INVALID_CREDENTIALS" });

const invalidRefreshToken = () =>
  ApiError.unauthorized("Invalid or expired session", { code: "INVALID_REFRESH_TOKEN" });

const buildSession = (user, refreshToken) => ({
  user,
  accessToken: signAccessToken(user),
  expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  refreshToken,
});

const register = async ({ name, email, password, phone, role }) => {
  const passwordHash = await hashPassword(password);

  // A duplicate email surfaces as Prisma P2002, which the error handler maps to 409.
  return prisma.user.create({
    data: { name, email, passwordHash, phone, role },
    select: publicUserSelect,
  });
};

const login = async ({ email, password }, meta) => {
  const account = await prisma.user.findUnique({ where: { email } });

  if (!account) {
    await verifyDummyPassword(password);
    throw invalidCredentials();
  }

  // Don't evaluate the password while locked, so a correct guess can't confirm itself.
  if (account.lockedUntil && account.lockedUntil > new Date()) {
    throw new ApiError(429, "Too many failed attempts. Please try again later.", {
      code: "ACCOUNT_LOCKED",
    });
  }

  const passwordOk = await verifyPassword(password, account.passwordHash);

  if (!passwordOk) {
    const { failedLoginAttempts } = await prisma.user.update({
      where: { id: account.id },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      await prisma.user.update({
        where: { id: account.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60 * 1000),
        },
      });
    }

    throw invalidCredentials();
  }

  if (!account.isActive) {
    throw invalidCredentials();
  }

  const user = await prisma.user.update({
    where: { id: account.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    select: publicUserSelect,
  });

  await tokens.pruneExpired(user.id);
  const { raw } = await tokens.issueRefreshToken({
    userId: user.id,
    familyId: randomUUID(),
    meta,
  });

  return buildSession(user, raw);
};

// Rotates the refresh token. Presenting a token that was already used revokes its whole family
// (the token was either stolen or replayed), forcing a fresh login.
const refresh = async (rawToken, meta) => {
  if (!rawToken) throw invalidRefreshToken();

  const current = await tokens.findByRawToken(rawToken);
  if (!current) throw invalidRefreshToken();

  if (current.revokedAt) {
    await tokens.revokeFamily(current.familyId);
    throw ApiError.unauthorized("Session is no longer valid", { code: "REFRESH_TOKEN_REUSED" });
  }

  if (current.expiresAt <= new Date()) throw invalidRefreshToken();

  const user = await prisma.user.findUnique({
    where: { id: current.userId },
    select: publicUserSelect,
  });
  if (!user || !user.isActive) throw invalidRefreshToken();

  const next = await prisma.$transaction(async (tx) => {
    // Atomic claim: only one concurrent request can revoke this token.
    const claimed = await tx.refreshToken.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (claimed.count !== 1) return null;

    const issued = await tokens.issueRefreshToken(
      { userId: user.id, familyId: current.familyId, meta },
      tx
    );
    await tx.refreshToken.update({
      where: { id: current.id },
      data: { replacedById: issued.record.id },
    });
    return issued;
  });

  if (!next) {
    await tokens.revokeFamily(current.familyId);
    throw ApiError.unauthorized("Session is no longer valid", { code: "REFRESH_TOKEN_REUSED" });
  }

  return buildSession(user, next.raw);
};

const logout = async (rawToken) => {
  if (!rawToken) return;
  const current = await tokens.findByRawToken(rawToken);
  if (current) await tokens.revokeFamily(current.familyId);
};

const logoutAll = (userId) => tokens.revokeAllForUser(userId);

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const account = await prisma.user.findUnique({ where: { id: userId } });

  if (!(await verifyPassword(currentPassword, account.passwordHash))) {
    throw ApiError.badRequest("Current password is incorrect", {
      code: "INVALID_CURRENT_PASSWORD",
    });
  }
  if (currentPassword === newPassword) {
    throw ApiError.badRequest("New password must be different from the current password");
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    tokens.revokeAllForUser(userId),
  ]);
};

module.exports = { register, login, refresh, logout, logoutAll, changePassword };
