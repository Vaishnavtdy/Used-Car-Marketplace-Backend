require("dotenv").config();

const path = require("path");
const { z } = require("zod");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    ),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Resolved against the backend root so it doesn't depend on the process working directory.
  UPLOAD_DIR: z
    .string()
    .default("uploads")
    .transform((v) => path.resolve(__dirname, "../..", v)),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const env = parsed.data;

if (env.NODE_ENV === "production") {
  if (/your-super-secret|changeme|secret-key/i.test(env.JWT_SECRET)) {
    console.error(
      "Invalid environment configuration:\n  - JWT_SECRET: placeholder value not allowed in production"
    );
    process.exit(1);
  }
  if (env.CORS_ORIGINS.length === 0) {
    console.error(
      "Invalid environment configuration:\n  - CORS_ORIGINS: must be set in production"
    );
    process.exit(1);
  }
}

module.exports = env;
