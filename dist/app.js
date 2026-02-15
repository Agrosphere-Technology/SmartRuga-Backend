"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = __importDefault(require("path"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const ranch_routes_1 = __importDefault(require("./routes/ranch.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const invite_routes_1 = __importDefault(require("./routes/invite.routes"));
const ranchInvite_routes_1 = __importDefault(require("./routes/ranchInvite.routes"));
const animal_routes_1 = __importDefault(require("./routes/animal.routes"));
const animalHealth_routes_1 = __importDefault(require("./routes/animalHealth.routes"));
const species_routes_1 = __importDefault(require("./routes/species.routes"));
const qr_routes_1 = __importDefault(require("./routes/qr.routes"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./docs/swagger");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
app.set("trust proxy", 1);
const origins = (process.env.CORS_ORIGIN || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
app.use((0, cors_1.default)({ origin: origins, credentials: true }));
app.use((0, helmet_1.default)({ hsts: process.env.NODE_ENV === "production" ? undefined : false }));
app.use((0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true }));
app.use(express_1.default.json({ limit: "1mb" }));
app.use((0, cookie_parser_1.default)());
app.use(logger_1.logMiddleware);
app.use(express_1.default.static(path_1.default.join(__dirname, "../public")));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/version", (_req, res) => res.json({
    name: "SmartRUGA API",
    version: "1.0.0",
    environment: process.env.NODE_ENV,
}));
// routes
app.use("/api/v1/auth", auth_routes_1.default);
app.use("/api/v1/ranches", ranch_routes_1.default);
app.use("/api/v1/admin", admin_routes_1.default);
app.use("/api/v1/invites", invite_routes_1.default);
app.use("/api/v1/ranches", ranchInvite_routes_1.default);
app.use("/api/v1/ranches", animal_routes_1.default);
app.use("/api/v1/ranches", animalHealth_routes_1.default);
app.use("/api/v1", species_routes_1.default);
app.use(qr_routes_1.default);
// Swagger docs (enable/disable with env)
const enableDocs = (process.env.SWAGGER_ENABLED || "true") === "true";
if (enableDocs) {
    app.get("/api/v1/docs.json", (_req, res) => res.json(swagger_1.swaggerSpec));
    app.use("/api/v1/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec));
}
app.get("/", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/index.html"));
});
app.get("/about", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/about.html"));
});
app.get("/docs", (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../public/docs.html"));
});
app;
exports.default = app;
