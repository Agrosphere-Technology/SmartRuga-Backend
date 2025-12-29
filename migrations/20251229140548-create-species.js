"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("species", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      code: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("species", ["code"], {
      unique: true,
      name: "species_code_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("species");
  },
};
