"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ranch_alerts", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ranches", key: "id" },
        onDelete: "CASCADE",
      },

      animal_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "animals", key: "id" },
        onDelete: "SET NULL",
      },

      alert_type: {
        type: Sequelize.ENUM(
          "health_sick",
          "health_quarantined",
          "status_sold",
          "status_deceased"
        ),
        allowNull: false,
      },

      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("ranch_alerts", ["ranch_id"]);
    await queryInterface.addIndex("ranch_alerts", ["animal_id"]);
    await queryInterface.addIndex("ranch_alerts", ["alert_type"]);
    await queryInterface.addIndex("ranch_alerts", ["is_read"]);

    // timeline-friendly index
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ranch_alerts_ranch_created_at
      ON ranch_alerts (ranch_id, created_at DESC);
    `);

    // common query: unread alerts for a ranch
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_ranch_alerts_ranch_is_read
      ON ranch_alerts (ranch_id, is_read);
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ranch_alerts");

    // Important: drop ENUM type in Postgres
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        DROP TYPE IF EXISTS "enum_ranch_alerts_alert_type";
      EXCEPTION
        WHEN undefined_object THEN null;
      END $$;
    `);
  },
};
