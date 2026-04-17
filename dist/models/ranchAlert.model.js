"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RanchAlertFactory = RanchAlertFactory;
const sequelize_1 = require("sequelize");
function RanchAlertFactory(sequelize) {
    return sequelize.define("RanchAlert", {
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
        animal_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        alert_type: {
            type: sequelize_1.DataTypes.ENUM("health_sick", "health_quarantined", "status_sold", "status_deceased", "low_stock", "vaccination_overdue", "task_created", "task_status_changed", "task_cancelled", "task_submission_pending_review", "task_submission_rejected", "concern_raised", "concern_resolved"),
            allowNull: false,
        },
        title: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: false,
        },
        message: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        priority: {
            type: sequelize_1.DataTypes.ENUM("low", "medium", "high"),
            allowNull: false,
            defaultValue: "medium",
        },
        entity_type: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        entity_public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        is_read: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        read_by: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        read_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        },
        created_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        tableName: "ranch_alerts",
        underscored: true,
        timestamps: false,
    });
}
