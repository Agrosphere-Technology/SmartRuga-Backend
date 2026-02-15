import path from "path";
import "dotenv/config";
import swaggerJSDoc from "swagger-jsdoc";
import { swaggerSchemas } from "./schemas";

const apis = [
  path.join(process.cwd(), "src/routes/*.ts"),   // dev
  path.join(process.cwd(), "dist/routes/*.js"),  // prod (Heroku)
];

export const swaggerSpec = swaggerJSDoc({
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
      schemas: swaggerSchemas,
    },
    security: [{ bearerAuth: [] }],
  },
  apis,
});
