"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryStockMovementFactory = InventoryStockMovementFactory;
const sequelize_1 = require("sequelize");
function InventoryStockMovementFactory(sequelize) {
    return sequelize.define("InventoryStockMovement", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            unique: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        inventory_item_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        ranch_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        type: {
            type: sequelize_1.DataTypes.ENUM("stock_in", "stock_out", "adjustment"),
            allowNull: false,
        },
        quantity: {
            type: sequelize_1.DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        previous_quantity: {
            type: sequelize_1.DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        new_quantity: {
            type: sequelize_1.DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        reason: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        reference_type: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        reference_public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        recorded_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
    }, {
        tableName: "inventory_stock_movements",
        underscored: true,
        timestamps: false,
    });
}
