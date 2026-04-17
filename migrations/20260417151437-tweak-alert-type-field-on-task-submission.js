"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'task_created';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'task_status_changed';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'task_cancelled';
    `);
  },

  async down(queryInterface, Sequelize) {
    // PostgreSQL does not safely support removing enum values directly.
    // Leaving down empty intentionally.
  },
};