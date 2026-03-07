import { DataTypes, Sequelize } from "sequelize";

export function RanchLocationFactory(sequelize: Sequelize) {
    return sequelize.define(
        "RanchLocation",
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
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            code: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            location_type: {
                type: DataTypes.ENUM(
                    "barn",
                    "pen",
                    "pasture",
                    "quarantine",
                    "clinic",
                    "loading_bay",
                    "market",
                    "external",
                    "other"
                ),
                allowNull: false,
                defaultValue: "other",
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            is_active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
        },
        {
            tableName: "ranch_locations",
            underscored: true,
            timestamps: true,
        }
    );
}