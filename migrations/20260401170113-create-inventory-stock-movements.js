"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("inventory_stock_movements", {
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
      inventory_item_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "inventory_items",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
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
      type: {
        type: Sequelize.ENUM("stock_in", "stock_out", "adjustment"),
        allowNull: false,
      },
      quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      previous_quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      new_quantity: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      reference_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      reference_public_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      recorded_by_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("inventory_stock_movements", ["public_id"], {
      unique: true,
      name: "inventory_stock_movements_public_id_unique",
    });

    await queryInterface.addIndex("inventory_stock_movements", ["inventory_item_id"], {
      name: "inventory_stock_movements_item_id_idx",
    });

    await queryInterface.addIndex("inventory_stock_movements", ["ranch_id"], {
      name: "inventory_stock_movements_ranch_id_idx",
    });

    await queryInterface.addIndex("inventory_stock_movements", ["type"], {
      name: "inventory_stock_movements_type_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("inventory_stock_movements");
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_inventory_stock_movements_type";'
    );
  },
};