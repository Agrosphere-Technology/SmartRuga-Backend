import { DataTypes, Sequelize } from "sequelize";

export function RanchAlertFactory(sequelize: Sequelize) {
    return sequelize.define(
        "RanchAlert",
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

            animal_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            alert_type: {
                type: DataTypes.ENUM(
                    "health_sick",
                    "health_quarantined",
                    "status_sold",
                    "status_deceased",
                    "low_stock",
                    "vaccination_overdue",
                    "task_submission_pending_review",
                    "task_submission_rejected"
                ),
                allowNull: false,
            },

            title: {
                type: DataTypes.STRING(255),
                allowNull: false,
            },

            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            priority: {
                type: DataTypes.ENUM("low", "medium", "high"),
                allowNull: false,
                defaultValue: "medium",
            },

            entity_type: {
                type: DataTypes.STRING(100),
                allowNull: true,
            },

            entity_public_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            is_read: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            read_by: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            read_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "ranch_alerts",
            underscored: true,
            timestamps: false,
        }
    );
}