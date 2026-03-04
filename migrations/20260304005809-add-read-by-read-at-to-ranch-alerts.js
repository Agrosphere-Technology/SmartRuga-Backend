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

async function indexExists(queryInterface, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = :indexName
    LIMIT 1;
  `,
    { replacements: { indexName } }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    // add read_by
    const hasReadBy = await columnExists(
      queryInterface,
      "ranch_alerts",
      "read_by"
    );
    if (!hasReadBy) {
      await queryInterface.addColumn("ranch_alerts", "read_by", {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    // add read_at
    const hasReadAt = await columnExists(
      queryInterface,
      "ranch_alerts",
      "read_at"
    );
    if (!hasReadAt) {
      await queryInterface.addColumn("ranch_alerts", "read_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // indexes
    if (!(await indexExists(queryInterface, "ranch_alerts_ranch_id_idx"))) {
      await queryInterface.addIndex("ranch_alerts", ["ranch_id"], {
        name: "ranch_alerts_ranch_id_idx",
      });
    }

    if (!(await indexExists(queryInterface, "ranch_alerts_is_read_idx"))) {
      await queryInterface.addIndex("ranch_alerts", ["is_read"], {
        name: "ranch_alerts_is_read_idx",
      });
    }

    if (!(await indexExists(queryInterface, "ranch_alerts_read_by_idx"))) {
      await queryInterface.addIndex("ranch_alerts", ["read_by"], {
        name: "ranch_alerts_read_by_idx",
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS ranch_alerts_read_by_idx;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS ranch_alerts_is_read_idx;`
    );
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS ranch_alerts_ranch_id_idx;`
    );

    const hasReadAt = await columnExists(
      queryInterface,
      "ranch_alerts",
      "read_at"
    );
    if (hasReadAt) await queryInterface.removeColumn("ranch_alerts", "read_at");

    const hasReadBy = await columnExists(
      queryInterface,
      "ranch_alerts",
      "read_by"
    );
    if (hasReadBy) await queryInterface.removeColumn("ranch_alerts", "read_by");
  },
};