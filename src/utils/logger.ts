import winston from "winston";
import type { Request, Response, NextFunction } from "express";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [new winston.transports.Console()],
  format:
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
          winston.format.printf(
            ({ level, message, timestamp, ...meta }) =>
              `[${timestamp}] ${level}: ${message}${
                Object.keys(meta).length ? " " + JSON.stringify(meta) : ""
              }`
          )
        ),
});

// 🧭 Express middleware to log every request
export function logMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
}
