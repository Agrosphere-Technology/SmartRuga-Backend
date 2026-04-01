import { DataTypes, Sequelize } from "sequelize";

export function InventoryStockMovementFactory(sequelize: Sequelize) {
    return sequelize.define(
        "InventoryStockMovement",
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

            inventory_item_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            ranch_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            type: {
                type: DataTypes.ENUM("stock_in", "stock_out", "adjustment"),
                allowNull: false,
            },

            quantity: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },

            previous_quantity: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },

            new_quantity: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
            },

            reason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            reference_type: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            reference_public_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            recorded_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
        },
        {
            tableName: "inventory_stock_movements",
            underscored: true,
            timestamps: false,
        }
    );
}