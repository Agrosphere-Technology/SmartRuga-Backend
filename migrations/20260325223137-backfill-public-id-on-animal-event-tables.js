"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE animal_health_events
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE animal_activity_events
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE animal_movement_events
      SET public_id = gen_random_uuid()
      WHERE public_id IS NULL;
    `);
  },

  async down() {
    // no-op
  },
};