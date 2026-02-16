"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("animal_status_events", {
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
      from_status: {
        type: Sequelize.ENUM("active", "sold", "deceased"),
        allowNull: false,
      },
      to_status: {
        type: Sequelize.ENUM("active", "sold", "deceased"),
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

    await queryInterface.addIndex("animal_status_events", ["animal_id"]);
    await queryInterface.addIndex("animal_status_events", ["to_status"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("animal_status_events");
  },
};
