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
    {
      replacements: { tableName, columnName },
    }
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
    {
      replacements: { indexName },
    }
  );

  return rows.length > 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const hasRfidTag = await columnExists(queryInterface, "animals", "rfid_tag");

    if (!hasRfidTag) {
      await queryInterface.addColumn("animals", "rfid_tag", {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }

    if (!(await indexExists(queryInterface, "animals_rfid_tag_unique"))) {
      await queryInterface.addIndex("animals", ["rfid_tag"], {
        unique: true,
        name: "animals_rfid_tag_unique",
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS animals_rfid_tag_unique;
    `);

    const hasRfidTag = await columnExists(queryInterface, "animals", "rfid_tag");
    if (hasRfidTag) {
      await queryInterface.removeColumn("animals", "rfid_tag");
    }
  },
};