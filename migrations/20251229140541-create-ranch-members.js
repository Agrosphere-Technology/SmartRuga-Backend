"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ranch_members", {
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
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
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
      status: {
        type: Sequelize.ENUM("active", "pending", "disabled"),
        allowNull: false,
        defaultValue: "pending",
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

    await queryInterface.addIndex("ranch_members", ["ranch_id", "user_id"], {
      unique: true,
      name: "ranch_members_ranch_user_unique",
    });

    await queryInterface.addIndex("ranch_members", ["ranch_id"], {
      name: "ranch_members_ranch_idx",
    });
    await queryInterface.addIndex("ranch_members", ["user_id"], {
      name: "ranch_members_user_idx",
    });
    await queryInterface.addIndex("ranch_members", ["role"], {
      name: "ranch_members_role_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("ranch_members");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ranch_members_role";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_ranch_members_status";'
    );
  },
};
