"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tasks", "cancelled_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("tasks", "cancelled_by_user_id", {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("tasks", "cancel_reason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addIndex("tasks", ["cancelled_at"], {
      name: "tasks_cancelled_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("tasks", "tasks_cancelled_at_idx");
    await queryInterface.removeColumn("tasks", "cancel_reason");
    await queryInterface.removeColumn("tasks", "cancelled_by_user_id");
    await queryInterface.removeColumn("tasks", "cancelled_at");
  },
};