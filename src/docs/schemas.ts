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

  // sprint 2 additions
  Species: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string", example: "Cow" },
      code: { type: "string", example: "cow" },
    },
    required: ["id", "name", "code"],
  },

  AnimalPublic: {
    type: "object",
    properties: {
      publicId: { type: "string", format: "uuid" },
      tagNumber: { type: ["string", "null"], example: "COW-001" },
      sex: { type: "string", enum: ["male", "female", "unknown"], example: "female" },
      status: { type: "string", enum: ["active", "sold", "deceased"], example: "active" },
      healthStatus: {
        type: "string",
        enum: ["healthy", "sick", "recovering", "quarantined"],
        example: "healthy",
      },
      species: { $ref: "#/components/schemas/Species" },
    },
    required: ["publicId", "sex", "status", "healthStatus", "species"],
  },

  Animal: {
    allOf: [
      { $ref: "#/components/schemas/AnimalPublic" },
      {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          qrUrl: { type: "string", example: "http://localhost:5000/a/2c99c39d-ea93-499c-93bb-51c4e0cb39ed" },
          dateOfBirth: { type: ["string", "null"], format: "date", example: "2023-05-01" },
          createdAt: { type: ["string", "null"], format: "date-time" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
        },
        required: ["id", "qrUrl"],
      },
    ],
  },

  CreateAnimalRequest: {
    type: "object",
    properties: {
      speciesId: { type: "string", format: "uuid" },
      tagNumber: { type: "string", example: "COW-001" },
      sex: { type: "string", enum: ["male", "female", "unknown"], example: "female" },
      dateOfBirth: { type: "string", format: "date", example: "2023-05-01" },
    },
    required: ["speciesId"],
  },

  CreateAnimalResponse: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      publicId: { type: "string", format: "uuid" },
      qrUrl: { type: "string" },
    },
    required: ["id", "publicId", "qrUrl"],
  },

};
