import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/auth.routes";
import ranchRoutes from "./routes/ranch.routes";

import { logMiddleware } from "./utils/logger";

const app = express();
app.set("trust proxy", 1);

const origins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));
app.use(
  helmet({ hsts: process.env.NODE_ENV === "production" ? undefined : false })
);
app.use(
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(logMiddleware);

app.use(express.static(path.join(__dirname, "../public")));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/version", (_req, res) =>
  res.json({
    name: "SmartRUGA API",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
  })
);

// routes

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/ranches", ranchRoutes);

export default app;
