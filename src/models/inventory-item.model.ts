import { DataTypes, Sequelize } from "sequelize";

export function InventoryItemFactory(sequelize: Sequelize) {
    return sequelize.define(
        "InventoryItem",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },

            public_id: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
                defaultValue: DataTypes.UUIDV4,
            },

            ranch_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            name: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },

            category: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            unit: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },

            sku: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            quantity_on_hand: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },

            reorder_level: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },

            created_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            updated_by_user_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },
        },
        {
            tableName: "inventory_items",
            underscored: true,
            timestamps: true,
        }
    );
}