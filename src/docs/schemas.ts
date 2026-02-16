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

  HealthEvent: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      status: { $ref: "#/components/schemas/HealthStatus" },
      notes: { type: ["string", "null"] },
      recordedBy: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          firstName: { type: ["string", "null"] },
          lastName: { type: ["string", "null"] },
        },
        required: ["id", "email"],
      },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "status", "recordedBy", "createdAt"],
  },

  HealthStatus: {
    type: "string",
    enum: ["healthy", "sick", "recovering", "quarantined"],
  },


  PaginationMeta: {
    type: "object",
    properties: {
      page: { type: "integer", example: 1 },
      limit: { type: "integer", example: 20 },
      total: { type: "integer", example: 5 },
      totalPages: { type: "integer", example: 1 },
    },
    required: ["page", "limit", "total", "totalPages"],
  },


  ListHealthEventsResponse: {
    type: "object",
    properties: {
      healthEvents: {
        type: "array",
        items: { $ref: "#/components/schemas/HealthEvent" },
      },
    },
    required: ["healthEvents"],
  },

  AnimalHealthHistoryResponse: {
    type: "object",
    properties: {
      animal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          publicId: { type: "string", format: "uuid" },
          tagNumber: { type: ["string", "null"] },
        },
        required: ["id", "publicId"],
      },
      pagination: { $ref: "#/components/schemas/PaginationMeta" },
      events: {
        type: "array",
        items: { $ref: "#/components/schemas/HealthHistoryEvent" },
      },
    },
    required: ["animal", "pagination", "events"],
  },

  AnimalLatestHealthResponse: {
    type: "object",
    properties: {
      animal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          publicId: { type: "string", format: "uuid" },
          tagNumber: { type: ["string", "null"] },
        },
        required: ["id", "publicId"],
      },
      latest: {
        type: ["object", "null"],
        properties: {
          id: { type: "string", format: "uuid" },
          status: { $ref: "#/components/schemas/HealthStatus" },
          notes: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      healthStatus: {
        $ref: "#/components/schemas/HealthStatus",
      },
    },
    required: ["animal", "healthStatus"],
  },

  AddAnimalHealthRequest: {
    type: "object",
    required: ["status"],
    properties: {
      status: { $ref: "#/components/schemas/HealthStatus" },
      notes: { type: ["string", "null"], maxLength: 500 },
    },
  },

  AnimalHealthBasicListResponse: {
    type: "object",
    properties: {
      healthEvents: {
        type: "array",
        items: { $ref: "#/components/schemas/AnimalHealthEvent" },
      },
    },
    required: ["healthEvents"],
  },

  AddAnimalHealthResponse: {
    type: "object",
    properties: {
      message: { type: "string" },
      animal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          publicId: { type: "string", format: "uuid" },
          tagNumber: { type: ["string", "null"] },
        },
        required: ["id", "publicId"],
      },
      healthEvent: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { $ref: "#/components/schemas/HealthStatus" },
          notes: { type: ["string", "null"] },
          recordedBy: { type: "string", format: "uuid" },
          createdAt: { type: "string", format: "date-time" },
        },
        required: ["id", "status", "recordedBy", "createdAt"],
      },
      healthStatus: { $ref: "#/components/schemas/HealthStatus" },
    },
    required: ["message", "animal", "healthEvent", "healthStatus"],
  },

  HealthHistoryEvent: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      status: { $ref: "#/components/schemas/HealthStatus" },
      notes: { type: ["string", "null"] },
      recordedBy: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          firstName: { type: ["string", "null"] },
          lastName: { type: ["string", "null"] },
        },
        required: ["id", "email"],
      },
      createdAt: { type: "string", format: "date-time" },
    },
    required: ["id", "status", "recordedBy", "createdAt"],
  },

  QrScanPublicResponse: {
    type: "object",
    properties: {
      publicId: { type: "string", format: "uuid" },
      tagNumber: { type: ["string", "null"] },
      sex: { type: "string", enum: ["male", "female", "unknown"] },
      status: { type: "string", enum: ["active", "sold", "deceased"] },
      healthStatus: { $ref: "#/components/schemas/HealthStatus" }, // from Sprint 2
      species: { $ref: "#/components/schemas/Species" },
    },
    required: ["publicId", "sex", "status", "healthStatus", "species"],
  },

  // UpdateAnimalResponse

  UpdateAnimalRequest: {
    type: "object",
    properties: {
      speciesId: { type: "string", format: "uuid" },
      tagNumber: { type: ["string", "null"], example: "COW-002" },
      sex: { type: "string", enum: ["male", "female", "unknown"] },
      dateOfBirth: { type: ["string", "null"], format: "date", example: "2023-05-01" },
      status: { type: "string", enum: ["active", "sold", "deceased"] },
    },
    additionalProperties: false,
  },

  UpdateAnimalResponse: {
    type: "object",
    properties: {
      message: { type: "string", example: "Animal updated" },
      animal: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          publicId: { type: "string", format: "uuid" },
          tagNumber: { type: ["string", "null"] },
          sex: { type: "string", enum: ["male", "female", "unknown"] },
          dateOfBirth: { type: ["string", "null"], format: "date" },
          status: { type: "string", enum: ["active", "sold", "deceased"] },
          speciesId: { type: "string", format: "uuid" },
          updatedAt: { type: ["string", "null"], format: "date-time" },
        },
        required: ["id", "publicId", "sex", "status", "speciesId"],
      },
    },
    required: ["message", "animal"],
  },

};


