export const swaggerSchemas = {
  ErrorResponse: {
    type: "object",
    properties: {
      message: { type: "string" },
      error: { type: "string", nullable: true },
      details: { type: "object", nullable: true },
    },
  },

  RegisterRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8 },
      firstName: { type: "string" },
      lastName: { type: "string" },
    },
  },

  LoginRequest: {
    type: "object",
    required: ["email", "password"],
    properties: {
      email: { type: "string", format: "email" },
      password: { type: "string" },
    },
  },

  AuthUser: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      firstName: { type: "string", nullable: true },
      lastName: { type: "string", nullable: true },
      platformRole: { type: "string", enum: ["user", "admin", "super_admin"] },
    },
  },

  AuthResponse: {
    type: "object",
    properties: {
      user: { $ref: "#/components/schemas/AuthUser" },
      accessToken: { type: "string" },
    },
  },

  RanchCreateRequest: {
    type: "object",
    required: ["name"],
    properties: {
      name: { type: "string" },
      locationName: { type: "string", nullable: true },
      address: { type: "string", nullable: true },
      latitude: { type: "number", nullable: true },
      longitude: { type: "number", nullable: true },
    },
  },

  RanchSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      slug: { type: "string" },
      role: {
        type: "string",
        enum: ["owner", "manager", "vet", "storekeeper", "worker"],
      },
      status: { type: "string", enum: ["active", "pending", "suspended"] },
    },
  },

  RanchResponse: {
    type: "object",
    properties: {
      ranch: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          slug: { type: "string" },
          locationName: { type: "string", nullable: true },
          address: { type: "string", nullable: true },
          latitude: { type: "number", nullable: true },
          longitude: { type: "number", nullable: true },
        },
      },
      membership: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          role: {
            type: "string",
            enum: ["owner", "manager", "vet", "storekeeper", "worker"],
          },
          status: { type: "string", enum: ["active", "pending", "suspended"] },
        },
      },
    },
  },

  InviteCreateRequest: {
    type: "object",
    required: ["email", "ranchRole"],
    properties: {
      email: { type: "string", format: "email" },
      ranchRole: {
        type: "string",
        enum: ["owner", "manager", "vet", "storekeeper", "worker"],
      },
    },
  },

  InviteSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      email: { type: "string", format: "email" },
      role: {
        type: "string",
        enum: ["owner", "manager", "vet", "storekeeper", "worker"],
      },
      expiresAt: { type: "string", format: "date-time" },
      usedAt: { type: "string", format: "date-time", nullable: true },
      createdAt: { type: "string", format: "date-time", nullable: true },
    },
  },

  InviteCreateResponse: {
    type: "object",
    properties: {
      invite: { $ref: "#/components/schemas/InviteSummary" },
      token: {
        type: "string",
        description: "Returned for testing; email later",
      },
    },
  },

  AcceptInviteRequest: {
    type: "object",
    required: ["token"],
    properties: {
      token: { type: "string" },
    },
  },

  AcceptInviteResponse: {
    type: "object",
    properties: {
      message: { type: "string" },
      ranchId: { type: "string", format: "uuid" },
      role: { type: "string" },
    },
  },

  UpdatePlatformRoleRequest: {
    type: "object",
    required: ["platformRole"],
    properties: {
      platformRole: { type: "string", enum: ["user", "admin", "super_admin"] },
    },
  },
};
