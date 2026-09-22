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

// Image URLs: an absolute http(s) URL without credentials, or a file served from this API's
// /uploads directory. Anything else (javascript:, data:, protocol-relative, ...) is rejected.
const isImageUrl = (value) => {
  if (value.startsWith("/uploads/")) {
    return /^\/uploads\/[A-Za-z0-9._\-/]+$/.test(value) && !value.includes("..");
  }
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname !== "" &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
};

const imageUrl = z
  .string()
  .trim()
  .min(1, "Required")
  .max(2048)
  .refine(isImageUrl, "Must be an http(s) URL or an /uploads/ path");

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

module.exports = {
  email,
  password,
  name,
  phone,
  idParam,
  paginationQuery,
  atLeastOneField,
  isImageUrl,
  imageUrl,
};
