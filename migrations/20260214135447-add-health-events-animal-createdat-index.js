"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(
      "animal_health_events",
      ["animal_id", "created_at"],
      { name: "animal_health_events_animal_created_at_idx" }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "animal_health_events",
      "animal_health_events_animal_created_at_idx"
    );
  },
};
