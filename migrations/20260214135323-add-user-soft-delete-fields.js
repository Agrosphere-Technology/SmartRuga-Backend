"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.addColumn("users", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    // helpful index for admin/user listing later
    await queryInterface.addIndex("users", ["is_active"], {
      name: "users_is_active_idx",
    });

    await queryInterface.addIndex("users", ["deleted_at"], {
      name: "users_deleted_at_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("users", "users_deleted_at_idx");
    await queryInterface.removeIndex("users", "users_is_active_idx");
    await queryInterface.removeColumn("users", "deleted_at");
    await queryInterface.removeColumn("users", "is_active");
  },
};
