"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const defaultSpecies = [
      { name: "Cow", code: "cow" },
      { name: "Goat", code: "goat" },
      { name: "Sheep", code: "sheep" },
      { name: "Horse", code: "horse" },
    ];

    for (const specie of defaultSpecies) {
      const existing = await queryInterface.sequelize.query(
        `
        SELECT id
        FROM species
        WHERE code = :code
        LIMIT 1
        `,
        {
          replacements: { code: specie.code },
          type: Sequelize.QueryTypes.SELECT,
        }
      );

      if (existing.length > 0) {
        continue;
      }

      await queryInterface.bulkInsert("species", [
        {
          id: Sequelize.literal("gen_random_uuid()"),
          name: specie.name,
          code: specie.code,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("species", {
      code: ["cow", "goat", "sheep", "horse"],
    });
  },
};