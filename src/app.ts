import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import path from "path";
import authRoutes from "./routes/auth.routes";
import ranchRoutes from "./routes/ranch.routes";
import adminRoutes from "./routes/admin.routes";
import inviteRoutes from "./routes/invite.routes";
import ranchInviteRoutes from "./routes/ranchInvite.routes";
import animalRoutes from "./routes/animal.routes";
import animalHealthEventRoutes from "./routes/animalHealth.routes";
import speciesRoutes from "./routes/species.routes";
import animalTimelineRoutes from "./routes/animalTimeline.routes";
import qrRoutes from "./routes/qr.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger";

import { logMiddleware } from "./utils/logger";

const app = express();
app.set("trust proxy", 1);

const origins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: origins, credentials: true }));
app.use(
  helmet({ hsts: process.env.NODE_ENV === "production" ? undefined : false }),
);
app.use(
  rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }),
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
  }),
);

// routes

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/ranches", ranchRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/invites", inviteRoutes);
app.use("/api/v1/ranches", ranchInviteRoutes);
app.use("/api/v1/ranches", animalRoutes);
app.use("/api/v1/ranches", animalHealthEventRoutes);
app.use("/api/v1/ranches", animalTimelineRoutes);
app.use("/api/v1", speciesRoutes);
app.use(qrRoutes);

// Swagger docs (enable/disable with env)
const enableDocs = (process.env.SWAGGER_ENABLED || "true") === "true";

if (enableDocs) {
  app.get("/api/v1/docs.json", (_req, res) => res.json(swaggerSpec));
  app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.get("/about", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/about.html"));
});

app.get("/docs", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/docs.html"));
});

app;

export default app;
