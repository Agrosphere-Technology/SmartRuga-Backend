import "dotenv/config";

import swaggerJSDoc from "swagger-jsdoc";
import { swaggerSchemas } from "./schemas";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "SmartRUGA API", version: "1.0.0" },
    servers: [
      {
        url: process.env.BASE_URL,
        description: "Local",
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
  apis: ["src/routes/*.ts"],
});
