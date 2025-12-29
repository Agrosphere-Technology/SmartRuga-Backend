"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ranches", "location_name", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn("ranches", "address", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn("ranches", "latitude", {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
    await queryInterface.addColumn("ranches", "longitude", {
      type: Sequelize.DECIMAL(10, 7),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("ranches", "location_name");
    await queryInterface.removeColumn("ranches", "address");
    await queryInterface.removeColumn("ranches", "latitude");
    await queryInterface.removeColumn("ranches", "longitude");
  },
};
