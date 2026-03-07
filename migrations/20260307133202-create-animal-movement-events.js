"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("animal_movement_events", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ranches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      animal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "animals", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      movement_type: {
        type: Sequelize.ENUM(
          "to_pasture",
          "to_quarantine",
          "to_barn",
          "to_market",
          "returned"
        ),
        allowNull: false,
      },

      from_location: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },

      to_location: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      recorded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("animal_movement_events", ["ranch_id"], {
      name: "animal_movement_events_ranch_idx",
    });

    await queryInterface.addIndex("animal_movement_events", ["animal_id"], {
      name: "animal_movement_events_animal_idx",
    });

    await queryInterface.addIndex("animal_movement_events", ["created_at"], {
      name: "animal_movement_events_created_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("animal_movement_events");
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_animal_movement_events_movement_type";`
    );
  },
};