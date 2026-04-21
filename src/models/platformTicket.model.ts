import { DataTypes, Sequelize } from "sequelize";

export function PlatformTicketFactory(sequelize: Sequelize) {
    return sequelize.define(
        "PlatformTicket",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                allowNull: false,
                primaryKey: true,
            },

            public_id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },

            ranch_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            raised_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            assigned_to_user_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            category: {
                type: DataTypes.ENUM(
                    "support",
                    "billing",
                    "technical_issue",
                    "account_access",
                    "feature_request",
                    "data_issue",
                    "other"
                ),
                allowNull: false,
                defaultValue: "support",
            },

            priority: {
                type: DataTypes.ENUM("low", "medium", "high", "urgent"),
                allowNull: false,
                defaultValue: "medium",
            },

            status: {
                type: DataTypes.ENUM("open", "in_review", "resolved", "closed"),
                allowNull: false,
                defaultValue: "open",
            },

            resolved_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            closed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: "platform_tickets",
            underscored: true,
            timestamps: true,
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    );
}