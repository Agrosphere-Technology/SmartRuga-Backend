"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ADD COLUMN IF NOT EXISTS public_id UUID DEFAULT gen_random_uuid();
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ADD COLUMN IF NOT EXISTS entity_public_id UUID;
    `);

    await queryInterface.sequelize.query(`
      UPDATE ranch_alerts
      SET
        public_id = COALESCE(public_id, gen_random_uuid()),
        title = COALESCE(
          title,
          CASE alert_type
            WHEN 'health_sick' THEN 'Animal health alert'
            WHEN 'health_quarantined' THEN 'Animal quarantine alert'
            WHEN 'status_sold' THEN 'Animal sold alert'
            WHEN 'status_deceased' THEN 'Animal deceased alert'
            ELSE 'Ranch alert'
          END
        )
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ALTER COLUMN public_id SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE ranch_alerts
      ALTER COLUMN title SET NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'low_stock';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'vaccination_overdue';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'task_submission_pending_review';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_ranch_alerts_alert_type" ADD VALUE IF NOT EXISTS 'task_submission_rejected';
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ranch_alerts_public_id_unique
      ON ranch_alerts (public_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ranch_alerts_ranch_id_idx
      ON ranch_alerts (ranch_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ranch_alerts_is_read_idx
      ON ranch_alerts (is_read);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ranch_alerts_alert_type_idx
      ON ranch_alerts (alert_type);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ranch_alerts_entity_idx
      ON ranch_alerts (entity_type, entity_public_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ranch_alerts_created_at_idx
      ON ranch_alerts (created_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_alerts_created_at_idx;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_alerts_entity_idx;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_alerts_alert_type_idx;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_alerts_is_read_idx;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_alerts_ranch_id_idx;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ranch_alerts_public_id_unique;
    `);

    await queryInterface.removeColumn("ranch_alerts", "entity_public_id");
    await queryInterface.removeColumn("ranch_alerts", "entity_type");
    await queryInterface.removeColumn("ranch_alerts", "priority");
    await queryInterface.removeColumn("ranch_alerts", "title");
    await queryInterface.removeColumn("ranch_alerts", "public_id");
  },
};