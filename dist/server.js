"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const node_http_1 = __importDefault(require("node:http"));
const app_1 = __importDefault(require("./app"));
const models_1 = require("./models");
const logger_1 = require("./utils/logger");
const initAdmin_1 = require("./utils/initAdmin");
const PORT = Number(process.env.PORT || 5000);
async function main() {
    try {
        await models_1.sequelize.authenticate();
        logger_1.logger.info("✅ Database connected successfully");
        // Only for local/dev experimentation — not production
        if (process.env.DB_SYNC === "true") {
            await models_1.sequelize.sync({ alter: true });
            logger_1.logger.info("✅ Models synced (dev mode)");
        }
        // Create super admin if none exists (safe, idempotent)
        await (0, initAdmin_1.ensureSuperAdmin)();
    }
    catch (err) {
        logger_1.logger.error("❌ Database init failed", { error: err.message });
        process.exit(1);
    }
    const server = node_http_1.default.createServer(app_1.default);
    server.keepAliveTimeout = 60_000;
    server.headersTimeout = 65_000;
    server.listen(PORT, () => {
        logger_1.logger.info(`🚀 SmartRUGA API running on http://localhost:${PORT}`);
    });
    const shutdown = async (sig, code = 0) => {
        logger_1.logger.info(`${sig} received, shutting down...`);
        try {
            await models_1.sequelize.close();
            logger_1.logger.info("DB connection closed");
        }
        catch (e) {
            logger_1.logger.error("Error closing DB", { error: e.message });
        }
        server.close(() => process.exit(code));
        setTimeout(() => process.exit(code || 1), 10_000).unref();
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("unhandledRejection", (r) => {
        logger_1.logger.error("unhandledRejection", { r });
        shutdown("unhandledRejection", 1);
    });
    process.on("uncaughtException", (err) => {
        logger_1.logger.error("uncaughtException", { err });
        shutdown("uncaughtException", 1);
    });
}
main();
