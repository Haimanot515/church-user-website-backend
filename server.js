require("dotenv").config();

const { validateEnv } = require("./config/env");
validateEnv();

const app = require("./app");
const prisma = require("./prisma/prisma.service");
const { syncAccessControl } = require("./services/accessService");
const { purgeExpired } = require("./services/sessionService");

const PORT = process.env.PORT || 5000;
let server;
const SESSION_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

const start = async () => {
  try {
    await prisma.connect();
    await syncAccessControl();
    await purgeExpired();
    setInterval(
      () => purgeExpired().catch((err) => console.error("Session purge failed:", err.message)),
      SESSION_PURGE_INTERVAL_MS
    ).unref();
    server = app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
    // Keep-alive slightly above typical proxy timeouts to avoid sporadic 502s.
    server.keepAliveTimeout = 65 * 1000;
    server.headersTimeout = 66 * 1000;
  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
};

// Graceful shutdown: stop accepting connections, finish in-flight requests, close the DB pool.
let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

start();
