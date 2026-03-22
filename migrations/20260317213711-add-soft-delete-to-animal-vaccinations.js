"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("animal_vaccinations", "updated_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("animal_vaccinations", "updated_by", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn("animal_vaccinations", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("animal_vaccinations", "deleted_by", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn("animal_vaccinations", "delete_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("animal_vaccinations", "updated_at");
    await queryInterface.removeColumn("animal_vaccinations", "updated_by");
    await queryInterface.removeColumn("animal_vaccinations", "deleted_at");
    await queryInterface.removeColumn("animal_vaccinations", "deleted_by");
    await queryInterface.removeColumn("animal_vaccinations", "delete_reason");
  },
};