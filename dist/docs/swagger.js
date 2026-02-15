"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
const path_1 = __importDefault(require("path"));
require("dotenv/config");
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const schemas_1 = require("./schemas");
const apis = [
    path_1.default.join(process.cwd(), "src/routes/*.ts"), // dev
    path_1.default.join(process.cwd(), "dist/routes/*.js"), // prod (Heroku)
];
exports.swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.3",
        info: { title: "SmartRUGA API", version: "1.0.0" },
        servers: [
            {
                url: process.env.BASE_URL || "http://localhost:5000",
                description: "API Server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
            },
            schemas: schemas_1.swaggerSchemas,
        },
        security: [{ bearerAuth: [] }],
    },
    apis,
});
