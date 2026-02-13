"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("animal_health_events", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      animal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "animals", key: "id" },
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM(
          "healthy",
          "sick",
          "recovering",
          "quarantined"
        ),
        allowNull: false,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.addIndex("animal_health_events", ["animal_id"]);
    await queryInterface.addIndex("animal_health_events", ["status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("animal_health_events");
  },
};
