const { z } = require("zod");

// An empty string from the form means "not set", same as null.
const brandName = z
  .string()
  .trim()
  .max(60, "At most 60 characters")
  .nullable()
  .transform((v) => v || null);

// The logo is edited only through the upload / remove-logo endpoints, so a settings edit is just
// the brand name. Whether the result still has an identity (this text, or a logo already on file)
// is checked in the service, which is the only place that knows the current logo state.
const updateBrandName = z.strictObject({ brandName });

module.exports = { updateBrandName };
