"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("platform_tickets", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        allowNull: false,
        primaryKey: true,
      },

      public_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        allowNull: false,
        unique: true,
      },

      ranch_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "ranches",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },

      category: {
        type: Sequelize.ENUM(
          "support",
          "billing",
          "technical_issue",
          "account_access",
          "feature_request",
          "data_issue",
          "other"
        ),
        allowNull: false,
        defaultValue: "support",
      },

      priority: {
        type: Sequelize.ENUM("low", "medium", "high", "urgent"),
        allowNull: false,
        defaultValue: "medium",
      },

      status: {
        type: Sequelize.ENUM("open", "in_review", "resolved", "closed"),
        allowNull: false,
        defaultValue: "open",
      },

      resolved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      closed_at: {
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

    await queryInterface.addIndex("platform_tickets", ["public_id"], {
      unique: true,
      name: "platform_tickets_public_id_unique",
    });

    await queryInterface.addIndex("platform_tickets", ["ranch_id"], {
      name: "platform_tickets_ranch_id_index",
    });

    await queryInterface.addIndex("platform_tickets", ["raised_by_user_id"], {
      name: "platform_tickets_raised_by_user_id_index",
    });

    await queryInterface.addIndex("platform_tickets", ["assigned_to_user_id"], {
      name: "platform_tickets_assigned_to_user_id_index",
    });

    await queryInterface.addIndex("platform_tickets", ["status"], {
      name: "platform_tickets_status_index",
    });

    await queryInterface.addIndex("platform_tickets", ["priority"], {
      name: "platform_tickets_priority_index",
    });

    await queryInterface.addIndex("platform_tickets", ["category"], {
      name: "platform_tickets_category_index",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("platform_tickets");

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_platform_tickets_category";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_platform_tickets_priority";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_platform_tickets_status";'
    );
  },
};