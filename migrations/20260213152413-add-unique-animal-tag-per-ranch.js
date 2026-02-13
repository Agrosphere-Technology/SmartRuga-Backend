"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // unique within ranch, but allow multiple NULL tag_number
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS animals_ranch_tag_unique
      ON animals (ranch_id, tag_number)
      WHERE tag_number IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS animals_ranch_tag_unique;
    `);
  },
};
