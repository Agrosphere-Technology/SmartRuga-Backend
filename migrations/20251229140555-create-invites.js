"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("invites", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ranches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      role: {
        type: Sequelize.ENUM(
          "owner",
          "manager",
          "vet",
          "storekeeper",
          "worker"
        ),
        allowNull: false,
      },
      token_hash: { type: Sequelize.STRING(255), allowNull: false },
      expires_at: { type: Sequelize.DATE, allowNull: false },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      used_at: { type: Sequelize.DATE, allowNull: true },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("invites", ["ranch_id"], {
      name: "invites_ranch_idx",
    });
    await queryInterface.addIndex("invites", ["expires_at"], {
      name: "invites_expires_idx",
    });
    await queryInterface.addIndex("invites", ["used_at"], {
      name: "invites_used_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("invites");
  },
};
