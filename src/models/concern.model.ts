import { DataTypes, Sequelize } from "sequelize";

export function ConcernFactory(sequelize: Sequelize) {
    return sequelize.define(
        "Concern",
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

            raised_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            assigned_to_user_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            category: {
                type: DataTypes.ENUM(
                    "health",
                    "inventory",
                    "animal",
                    "facility",
                    "security",
                    "task",
                    "other"
                ),
                allowNull: false,
                defaultValue: "other",
            },

            title: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            priority: {
                type: DataTypes.ENUM("low", "medium", "high", "urgent"),
                allowNull: false,
                defaultValue: "medium",
            },

            status: {
                type: DataTypes.ENUM("open", "in_review", "resolved", "dismissed"),
                allowNull: false,
                defaultValue: "open",
            },

            entity_type: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            entity_public_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            image_url: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            image_public_id: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            resolution_notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            resolved_by_user_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            resolved_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: "concerns",
            underscored: true,
            timestamps: true,
        }
    );
}