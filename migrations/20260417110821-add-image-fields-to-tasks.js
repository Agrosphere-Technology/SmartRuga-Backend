"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tasks", "image_url", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("tasks", "image_public_id", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("tasks", "image_public_id");
    await queryInterface.removeColumn("tasks", "image_url");
  },
};