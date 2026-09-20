const { PrismaClient } = require("@prisma/client");

// Ensures .env is loaded and validated before the client reads DATABASE_URL.
require("./env");

const prisma = new PrismaClient({ log: ["warn", "error"] });

module.exports = prisma;
