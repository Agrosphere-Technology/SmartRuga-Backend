"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("animal_health_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: false,
    });

    await queryInterface.changeColumn("animal_activity_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: false,
    });

    await queryInterface.changeColumn("animal_movement_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("animal_health_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.changeColumn("animal_activity_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.changeColumn("animal_movement_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });
  },
};