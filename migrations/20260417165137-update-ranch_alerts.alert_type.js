"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type"
      ADD VALUE IF NOT EXISTS 'concern_raised';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type"
      ADD VALUE IF NOT EXISTS 'concern_resolved';
    `);
  },

  async down() {
    // postgres enum value removal is not straightforward
  },
};