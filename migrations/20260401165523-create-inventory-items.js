"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("inventory_items", {
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

      name: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },

      category: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },

      unit: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },

      sku: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      quantity_on_hand: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      reorder_level: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },

      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },

      created_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },

      updated_by_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    // 🔥 Indexes (important for performance)
    await queryInterface.addIndex("inventory_items", ["public_id"], {
      unique: true,
      name: "inventory_items_public_id_unique",
    });

    await queryInterface.addIndex("inventory_items", ["ranch_id"], {
      name: "inventory_items_ranch_id_idx",
    });

    await queryInterface.addIndex("inventory_items", ["name"], {
      name: "inventory_items_name_idx",
    });

    await queryInterface.addIndex("inventory_items", ["category"], {
      name: "inventory_items_category_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inventory_items");
  },
};