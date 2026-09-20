// Validates req.body / req.query / req.params against zod schemas and exposes the parsed
// (coerced, defaulted, unknown-keys-stripped) values on req.validated. Controllers should
// read from req.validated rather than the raw request.
const validate = (schemas) => (req, res, next) => {
  const validated = {};

  for (const key of ["body", "query", "params"]) {
    if (schemas[key]) {
      // A ZodError thrown here is turned into a 422 by the error handler.
      validated[key] = schemas[key].parse(req[key]);
    }
  }

  req.validated = validated;
  next();
};

module.exports = validate;
