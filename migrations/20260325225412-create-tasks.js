"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("tasks", {
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
        references: {
          model: "ranches",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      assigned_to_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      assigned_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.ENUM("pending", "in_progress", "completed"),
        allowNull: false,
        defaultValue: "pending",
      },
      due_date: {
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

    await queryInterface.addIndex("tasks", ["public_id"], {
      unique: true,
      name: "tasks_public_id_unique",
    });

    await queryInterface.addIndex("tasks", ["ranch_id"], {
      name: "tasks_ranch_id_idx",
    });

    await queryInterface.addIndex("tasks", ["assigned_to_user_id"], {
      name: "tasks_assigned_to_user_id_idx",
    });

    await queryInterface.addIndex("tasks", ["status"], {
      name: "tasks_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("tasks");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_tasks_status";'
    );
  },
};