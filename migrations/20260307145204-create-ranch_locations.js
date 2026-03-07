"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ranch_locations", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      public_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "ranches",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      code: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },

      location_type: {
        type: Sequelize.ENUM(
          "barn",
          "pen",
          "pasture",
          "quarantine",
          "clinic",
          "loading_bay",
          "market",
          "external",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },

      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await queryInterface.addIndex("ranch_locations", ["ranch_id"]);
    await queryInterface.addIndex("ranch_locations", ["public_id"], {
      unique: true,
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX ranch_locations_ranch_id_name_unique
      ON ranch_locations (ranch_id, lower(name));
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX ranch_locations_ranch_id_code_unique
      ON ranch_locations (ranch_id, lower(code))
      WHERE code IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_locations_ranch_id_code_unique;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_locations_ranch_id_name_unique;
    `);

    await queryInterface.dropTable("ranch_locations");
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_ranch_locations_location_type";
    `);
  },
};