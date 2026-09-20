const { z } = require("zod");
const {
  email,
  password,
  name,
  phone,
  idParam,
  paginationQuery,
  atLeastOneField,
} = require("./common");

// SUPER_ADMIN is deliberately absent: it can only be created by the seed script.
const assignableRole = z.enum(["USER", "DEALER", "ADMIN"]);

const updateMe = atLeastOneField(
  z.object({
    name: name.optional(),
    phone: phone.nullable().optional(),
  })
);

const createUser = z.object({
  name,
  email,
  password,
  phone: phone.optional(),
  role: assignableRole.default("USER"),
});

const updateUser = atLeastOneField(
  z.object({
    name: name.optional(),
    phone: phone.nullable().optional(),
    role: assignableRole.optional(),
    isActive: z.boolean().optional(),
  })
);

const resetPassword = z.object({ password });

const listQuery = paginationQuery().extend({
  role: z.enum(["USER", "DEALER", "ADMIN", "SUPER_ADMIN"]).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

module.exports = { idParam, updateMe, createUser, updateUser, resetPassword, listQuery };
