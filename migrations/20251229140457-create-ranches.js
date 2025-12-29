"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ranches", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(120), allowNull: false, unique: true },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
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

    await queryInterface.addIndex("ranches", ["slug"], {
      unique: true,
      name: "ranches_slug_unique",
    });
    await queryInterface.addIndex("ranches", ["created_by"], {
      name: "ranches_created_by_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ranches");
  },
};
