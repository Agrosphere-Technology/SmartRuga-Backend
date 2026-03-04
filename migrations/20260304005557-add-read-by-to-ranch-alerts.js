"use strict";

async function columnExists(queryInterface, tableName, columnName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = :tableName
      AND column_name = :columnName
    LIMIT 1;
  `,
    { replacements: { tableName, columnName } }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const hasReadBy = await columnExists(queryInterface, "ranch_alerts", "read_by");
    if (!hasReadBy) {
      await queryInterface.addColumn("ranch_alerts", "read_by", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    const hasReadAt = await columnExists(queryInterface, "ranch_alerts", "read_at");
    if (!hasReadAt) {
      await queryInterface.addColumn("ranch_alerts", "read_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Helpful indexes
    await queryInterface.addIndex("ranch_alerts", ["ranch_id"], {
      name: "ranch_alerts_ranch_id_idx",
    }).catch(() => { });

    await queryInterface.addIndex("ranch_alerts", ["is_read"], {
      name: "ranch_alerts_is_read_idx",
    }).catch(() => { });

    await queryInterface.addIndex("ranch_alerts", ["read_by"], {
      name: "ranch_alerts_read_by_idx",
    }).catch(() => { });
  },

  async down(queryInterface) {
    // Drop indexes (ignore errors)
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_read_by_idx").catch(() => { });
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_is_read_idx").catch(() => { });
    await queryInterface.removeIndex("ranch_alerts", "ranch_alerts_ranch_id_idx").catch(() => { });

    // Drop columns if they exist
    const hasReadAt = await columnExists(queryInterface, "ranch_alerts", "read_at");
    if (hasReadAt) await queryInterface.removeColumn("ranch_alerts", "read_at");

    const hasReadBy = await columnExists(queryInterface, "ranch_alerts", "read_by");
    if (hasReadBy) await queryInterface.removeColumn("ranch_alerts", "read_by");
  },
};