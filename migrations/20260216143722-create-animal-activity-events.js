"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("animal_activity_events", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ranches", key: "id" },
        onDelete: "CASCADE",
      },

      animal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "animals", key: "id" },
        onDelete: "CASCADE",
      },

      event_type: {
        type: Sequelize.ENUM("animal_update"),
        allowNull: false,
        defaultValue: "animal_update",
      },

      field: {
        type: Sequelize.STRING(50),
        allowNull: false, // e.g. status, tag_number, species_id, sex, date_of_birth
      },

      from_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      to_value: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true, // statusNotes etc
      },

      recorded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "RESTRICT",
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("animal_activity_events", ["animal_id"]);
    await queryInterface.addIndex("animal_activity_events", ["ranch_id"]);
    await queryInterface.addIndex("animal_activity_events", ["event_type"]);
    await queryInterface.addIndex("animal_activity_events", ["created_at"]);

    // Helpful for timeline queries later
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_animal_activity_animal_created_at
      ON animal_activity_events (animal_id, created_at DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("animal_activity_events");
  },
};
