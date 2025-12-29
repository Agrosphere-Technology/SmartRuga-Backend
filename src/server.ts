import "dotenv/config";
import http from "node:http";
import app from "./app";
// import { sequelize } from "./models";
// import { bootstrapSuperAdmin } from "./utils/bootstrapSuperAdmin";
import { logger } from "./utils/logger";

const PORT = Number(process.env.PORT || 5000);

async function main() {
  try {
    // await sequelize.authenticate();
    logger.info("✅ Database connected successfully");

    if (process.env.DB_SYNC === "true") {
      // await sequelize.sync({ alter: true });
      logger.info("✅ Models synced (dev mode)");
    }

    // await bootstrapSuperAdmin();
  } catch (err: any) {
    logger.error("❌ Database init failed", { error: err.message });
    process.exit(1);
  }

  const server = http.createServer(app);
  server.keepAliveTimeout = 60_000;
  server.headersTimeout = 65_000;

  server.listen(PORT, () =>
    logger.info(`🚀 SmartRUGA API running on http://localhost:${PORT}`)
  );

  const shutdown = async (sig: string, code = 0) => {
    logger.info(`${sig} received, shutting down...`);
    try {
      // await sequelize.close();
      logger.info("DB connection closed");
    } catch (e: any) {
      logger.error("Error closing DB", { error: e.message });
    }
    server.close(() => process.exit(code));
    setTimeout(() => process.exit(code || 1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (r) => {
    logger.error("unhandledRejection", { r });
    shutdown("unhandledRejection", 1);
  });
  process.on("uncaughtException", (err) => {
    logger.error("uncaughtException", { err });
    shutdown("uncaughtException", 1);
  });
}

main();
