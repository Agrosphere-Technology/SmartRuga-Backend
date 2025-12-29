"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("refresh_tokens", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      token_hash: { type: Sequelize.STRING(255), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },

      revoked_at: { type: Sequelize.DATE, allowNull: true },
      replaced_by_hash: { type: Sequelize.STRING(255), allowNull: true },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("refresh_tokens", ["user_id"], {
      name: "refresh_tokens_user_idx",
    });
    await queryInterface.addIndex("refresh_tokens", ["token_hash"], {
      unique: true,
      name: "refresh_tokens_hash_unique",
    });
    await queryInterface.addIndex("refresh_tokens", ["expires_at"], {
      name: "refresh_tokens_expires_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("refresh_tokens");
  },
};
