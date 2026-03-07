"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("animal_movement_events", "from_location");
    await queryInterface.removeColumn("animal_movement_events", "to_location");

    await queryInterface.addColumn("animal_movement_events", "from_location_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "ranch_locations",
        key: "id",
      },
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("animal_movement_events", "to_location_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "ranch_locations",
        key: "id",
      },
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("animal_movement_events", ["from_location_id"]);
    await queryInterface.addIndex("animal_movement_events", ["to_location_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("animal_movement_events", ["from_location_id"]);
    await queryInterface.removeIndex("animal_movement_events", ["to_location_id"]);

    await queryInterface.removeColumn("animal_movement_events", "from_location_id");
    await queryInterface.removeColumn("animal_movement_events", "to_location_id");

    await queryInterface.addColumn("animal_movement_events", "from_location", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });

    await queryInterface.addColumn("animal_movement_events", "to_location", {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
  },
};