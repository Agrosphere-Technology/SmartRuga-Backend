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
                    "status_deceased"
                ),
                allowNull: false,
            },
            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            is_read: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
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
