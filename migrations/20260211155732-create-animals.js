"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("animals", {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      public_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ranches", key: "id" },
        onDelete: "CASCADE",
      },
      species_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "species", key: "id" },
      },
      tag_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      sex: {
        type: Sequelize.ENUM("male", "female", "unknown"),
        allowNull: false,
        defaultValue: "unknown",
      },
      date_of_birth: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "sold", "deceased"),
        allowNull: false,
        defaultValue: "active",
      },
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

    await queryInterface.addIndex("animals", ["ranch_id"]);
    await queryInterface.addIndex("animals", ["public_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("animals");
  },
};
