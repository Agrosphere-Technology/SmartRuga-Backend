"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("invites", "email", {
      type: Sequelize.STRING(255),
      allowNull: false,
    });

    await queryInterface.addIndex("invites", ["email"], {
      name: "invites_email_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("invites", "invites_email_idx");
    await queryInterface.removeColumn("invites", "email");
  },
};
