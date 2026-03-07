"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("animals", "current_location_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "ranch_locations",
        key: "id",
      },
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("animals", ["current_location_id"]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("animals", ["current_location_id"]);
    await queryInterface.removeColumn("animals", "current_location_id");
  },
};