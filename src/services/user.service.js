const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const { hashPassword } = require("../utils/password");
const { publicUserSelect } = require("../utils/userSelect");
const { pageInfo } = require("../utils/response");
const tokens = require("./token.service");

// Which roles each role may manage (create, edit, deactivate, reset password for).
// SUPER_ADMIN accounts are never manageable through the API — they exist only via the seed script.
const MANAGEABLE_ROLES = {
  ADMIN: ["USER", "DEALER"],
  SUPER_ADMIN: ["USER", "DEALER", "ADMIN"],
};

const canManage = (actorRole, targetRole) =>
  MANAGEABLE_ROLES[actorRole]?.includes(targetRole) ?? false;

const assertCanManage = (actor, targetRole) => {
  if (!canManage(actor.role, targetRole)) {
    throw ApiError.forbidden(`Your role cannot manage ${targetRole} accounts`);
  }
};

const findOrThrow = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

const list = async ({ page, limit, role, isActive, search }) => {
  const where = {
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, pagination: pageInfo({ page, limit, total }) };
};

const getById = (id) => findOrThrow(id);

// Accounts created by an admin start with a temporary password the user must change on first login.
const create = async (actor, { name, email, password, phone, role }) => {
  assertCanManage(actor, role);

  return prisma.user.create({
    data: {
      name,
      email,
      phone,
      role,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
    select: publicUserSelect,
  });
};

const update = async (actor, id, data) => {
  if (id === actor.id && (data.role !== undefined || data.isActive !== undefined)) {
    throw ApiError.forbidden("You cannot change your own role or status");
  }

  const target = await findOrThrow(id);
  assertCanManage(actor, target.role);
  if (data.role !== undefined) assertCanManage(actor, data.role);

  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        ...data,
        // Reactivating an account also clears any login lockout.
        ...(data.isActive === true && { failedLoginAttempts: 0, lockedUntil: null }),
      },
      select: publicUserSelect,
    }),
    ...(data.isActive === false || (data.role !== undefined && data.role !== target.role)
      ? [tokens.revokeAllForUser(id)]
      : []),
  ]);

  return user;
};

const resetPassword = async (actor, id, password) => {
  if (id === actor.id) {
    throw ApiError.forbidden("Use the change-password endpoint for your own account");
  }

  const target = await findOrThrow(id);
  assertCanManage(actor, target.role);

  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }),
    tokens.revokeAllForUser(id),
  ]);
};

const updateMe = (userId, data) =>
  prisma.user.update({ where: { id: userId }, data, select: publicUserSelect });

module.exports = { list, getById, create, update, resetPassword, updateMe };
