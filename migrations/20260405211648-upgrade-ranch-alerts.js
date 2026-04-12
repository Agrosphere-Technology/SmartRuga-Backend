"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ranch_alerts", "public_id", {
      type: Sequelize.UUID,
      allowNull: true,
      unique: true,
      defaultValue: Sequelize.literal("gen_random_uuid()"),
    });

    await queryInterface.addColumn("ranch_alerts", "title", {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.addColumn("ranch_alerts", "priority", {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: "medium",
    });

    await queryInterface.addColumn("ranch_alerts", "entity_type", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("ranch_alerts", "entity_public_id", {
      type: Sequelize.UUID,
      allowNull: true,
    });

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

    await queryInterface.changeColumn("ranch_alerts", "public_id", {
      type: Sequelize.UUID,
      allowNull: false,
      unique: true,
      defaultValue: Sequelize.literal("gen_random_uuid()"),
    });

    await queryInterface.changeColumn("ranch_alerts", "title", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

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

    await queryInterface.addIndex("ranch_alerts", ["public_id"], {
      unique: true,
      name: "ranch_alerts_public_id_unique",
    });

    await queryInterface.addIndex("ranch_alerts", ["ranch_id"], {
      name: "ranch_alerts_ranch_id_idx",
    });

    await queryInterface.addIndex("ranch_alerts", ["is_read"], {
      name: "ranch_alerts_is_read_idx",
    });

    await queryInterface.addIndex("ranch_alerts", ["alert_type"], {
      name: "ranch_alerts_alert_type_idx",
    });

    await queryInterface.addIndex("ranch_alerts", ["entity_type", "entity_public_id"], {
      name: "ranch_alerts_entity_idx",
    });

    await queryInterface.addIndex("ranch_alerts", ["created_at"], {
      name: "ranch_alerts_created_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_created_at_idx");
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_entity_idx");
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_alert_type_idx");
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_is_read_idx");
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_ranch_id_idx");
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_public_id_unique");

    await queryInterface.removeColumn("ranch_alerts", "entity_public_id");
    await queryInterface.removeColumn("ranch_alerts", "entity_type");
    await queryInterface.removeColumn("ranch_alerts", "priority");
    await queryInterface.removeColumn("ranch_alerts", "title");
    await queryInterface.removeColumn("ranch_alerts", "public_id");
  },
};