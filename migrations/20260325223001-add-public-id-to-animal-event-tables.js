"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("animal_health_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn("animal_activity_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addColumn("animal_movement_events", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

    await queryInterface.addIndex("animal_health_events", ["public_id"], {
      unique: true,
      name: "animal_health_events_public_id_unique",
    });

    await queryInterface.addIndex("animal_activity_events", ["public_id"], {
      unique: true,
      name: "animal_activity_events_public_id_unique",
    });

    await queryInterface.addIndex("animal_movement_events", ["public_id"], {
      unique: true,
      name: "animal_movement_events_public_id_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "animal_movement_events",
      "animal_movement_events_public_id_unique"
    );
    await queryInterface.removeIndex(
      "animal_activity_events",
      "animal_activity_events_public_id_unique"
    );
    await queryInterface.removeIndex(
      "animal_health_events",
      "animal_health_events_public_id_unique"
    );

    await queryInterface.removeColumn("animal_movement_events", "public_id");
    await queryInterface.removeColumn("animal_activity_events", "public_id");
    await queryInterface.removeColumn("animal_health_events", "public_id");
  },
};