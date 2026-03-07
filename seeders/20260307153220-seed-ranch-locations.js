"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const ranches = await queryInterface.sequelize.query(
      `SELECT id FROM ranches`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!ranches.length) {
      console.log("No ranches found. Skipping location seeding.");
      return;
    }

    const defaultLocations = [
      {
        name: "Main Barn",
        code: "BARN",
        location_type: "barn",
        description: "Primary animal housing area",
      },
      {
        name: "Quarantine Pen",
        code: "QUAR",
        location_type: "quarantine",
        description: "Isolation area for sick or new animals",
      },
      {
        name: "Veterinary Clinic",
        code: "VET",
        location_type: "clinic",
        description: "Veterinary treatment and examination area",
      },
      {
        name: "Market Holding",
        code: "MARKET",
        location_type: "market",
        description: "Animals waiting for transport to market",
      },
    ];

    for (const ranch of ranches) {
      for (const location of defaultLocations) {
        const existing = await queryInterface.sequelize.query(
          `
          SELECT id
          FROM ranch_locations
          WHERE ranch_id = :ranchId
            AND code = :code
          LIMIT 1
          `,
          {
            replacements: {
              ranchId: ranch.id,
              code: location.code,
            },
            type: Sequelize.QueryTypes.SELECT,
          }
        );

        if (existing.length > 0) {
          continue;
        }

        await queryInterface.bulkInsert("ranch_locations", [
          {
            id: Sequelize.literal("gen_random_uuid()"),
            public_id: Sequelize.literal("gen_random_uuid()"),
            ranch_id: ranch.id,
            name: location.name,
            code: location.code,
            location_type: location.location_type,
            description: location.description,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("ranch_locations", {
      code: ["BARN", "QUAR", "VET", "MARKET"],
    });
  },
};