"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryItemFactory = InventoryItemFactory;
const sequelize_1 = require("sequelize");
function InventoryItemFactory(sequelize) {
    return sequelize.define("InventoryItem", {
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
        ranch_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        name: {
            type: sequelize_1.DataTypes.STRING(150),
            allowNull: false,
        },
        category: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        unit: {
            type: sequelize_1.DataTypes.STRING(50),
            allowNull: false,
        },
        sku: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        description: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        image_url: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        image_public_id: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: true,
        },
        quantity_on_hand: {
            type: sequelize_1.DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        reorder_level: {
            type: sequelize_1.DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
        },
        is_active: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
        created_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        updated_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
    }, {
        tableName: "inventory_items",
        underscored: true,
        timestamps: true,
    });
}
