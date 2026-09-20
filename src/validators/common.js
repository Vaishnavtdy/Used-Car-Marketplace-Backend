const { z } = require("zod");

// Field schemas shared by several validators.

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

// bcrypt only uses the first 72 bytes, so cap the length well below that.
const password = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(64, "Password must be at most 64 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

const name = z.string().trim().min(2).max(100);

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,15}$/, "Invalid phone number");

const idParam = z.object({
  id: z.coerce.number().int().positive(),
});

const paginationQuery = ({ defaultLimit = 20, maxLimit = 100 } = {}) =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  });

// Rejects requests that carry no updatable fields.
const atLeastOneField = (schema) =>
  schema.refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required",
  });

module.exports = { email, password, name, phone, idParam, paginationQuery, atLeastOneField };
