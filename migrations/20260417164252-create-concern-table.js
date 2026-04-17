"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("concerns", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
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
        references: {
          model: "ranches",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      raised_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_to_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      category: {
        type: Sequelize.ENUM(
          "health",
          "inventory",
          "animal",
          "facility",
          "security",
          "task",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      priority: {
        type: Sequelize.ENUM("low", "medium", "high", "urgent"),
        allowNull: false,
        defaultValue: "medium",
      },
      status: {
        type: Sequelize.ENUM("open", "in_review", "resolved", "dismissed"),
        allowNull: false,
        defaultValue: "open",
      },
      entity_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      entity_public_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image_public_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      resolution_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolved_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("concerns", ["ranch_id"]);
    await queryInterface.addIndex("concerns", ["raised_by_user_id"]);
    await queryInterface.addIndex("concerns", ["assigned_to_user_id"]);
    await queryInterface.addIndex("concerns", ["status"]);
    await queryInterface.addIndex("concerns", ["priority"]);
    await queryInterface.addIndex("concerns", ["category"]);
    await queryInterface.addIndex("concerns", ["entity_type", "entity_public_id"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("concerns");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_concerns_category";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_concerns_priority";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_concerns_status";'
    );
  },
};