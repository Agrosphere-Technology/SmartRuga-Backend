"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logMiddleware = logMiddleware;
const winston_1 = __importDefault(require("winston"));
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    transports: [new winston_1.default.transports.Console()],
    format: process.env.NODE_ENV === "production"
        ? winston_1.default.format.json()
        : winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), winston_1.default.format.printf(({ level, message, timestamp, ...meta }) => `[${timestamp}] ${level}: ${message}${Object.keys(meta).length ? " " + JSON.stringify(meta) : ""}`)),
});
// 🧭 Express middleware to log every request
function logMiddleware(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        exports.logger.info(`${req.method} ${req.originalUrl}`, {
            status: res.statusCode,
            durationMs: Date.now() - start,
            ip: req.ip,
        });
    });
    next();
}
