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
    const hasPhone = await columnExists(queryInterface, "users", "phone");
    if (!hasPhone) {
      await queryInterface.addColumn("users", "phone", {
        type: Sequelize.STRING(30),
        allowNull: true,
      });

      await queryInterface.addIndex("users", ["phone"], {
        name: "users_phone_idx",
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "users_phone_idx").catch(() => { });
    const hasPhone = await columnExists(queryInterface, "users", "phone");
    if (hasPhone) await queryInterface.removeColumn("users", "phone");
  },
};