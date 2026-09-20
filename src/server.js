const env = require("./config/env");
const prisma = require("./config/db");
const app = require("./app");

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} (${env.NODE_ENV})`);
});

const shutdown = (reason, exitCode = 0) => {
  console.log(`${reason} received, shutting down`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(exitCode);
  });

  // Don't hang forever on open keep-alive connections.
  setTimeout(() => process.exit(exitCode || 1), 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});
