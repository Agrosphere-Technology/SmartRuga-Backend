"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("animals", "breed", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn("animals", "weight", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("animals", "breed");
    await queryInterface.removeColumn("animals", "weight");
  },
};