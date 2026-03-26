"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("task_submissions", {
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
      task_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "tasks",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      submitted_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      proof_type: {
        type: Sequelize.ENUM("image", "scan"),
        allowNull: false,
      },
      proof_url: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      review_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reviewed_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reviewed_at: {
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

    await queryInterface.addIndex("task_submissions", ["public_id"], {
      unique: true,
      name: "task_submissions_public_id_unique",
    });

    await queryInterface.addIndex("task_submissions", ["task_id"], {
      name: "task_submissions_task_id_idx",
    });

    await queryInterface.addIndex("task_submissions", ["status"], {
      name: "task_submissions_status_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("task_submissions");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_task_submissions_proof_type";'
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_task_submissions_status";'
    );
  },
};