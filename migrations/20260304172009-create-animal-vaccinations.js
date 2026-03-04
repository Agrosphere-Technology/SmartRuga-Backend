"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("animal_vaccinations", {
      id: {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },

      public_id: {
        type: Sequelize.UUID,
        allowNull: false,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        unique: true,
      },

      ranch_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "ranches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      animal_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "animals", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      vaccine_name: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },

      dose: {
        type: Sequelize.STRING(60),
        allowNull: true,
      },

      administered_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },

      next_due_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      administered_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },

      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("animal_vaccinations", ["public_id"], {
      name: "animal_vaccinations_public_id_idx",
      unique: true,
    });

    await queryInterface.addIndex("animal_vaccinations", ["ranch_id"], {
      name: "animal_vaccinations_ranch_idx",
    });

    await queryInterface.addIndex("animal_vaccinations", ["animal_id"], {
      name: "animal_vaccinations_animal_idx",
    });

    await queryInterface.addIndex("animal_vaccinations", ["next_due_at"], {
      name: "animal_vaccinations_next_due_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("animal_vaccinations");
  },
};