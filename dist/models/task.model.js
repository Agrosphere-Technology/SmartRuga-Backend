"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskFactory = TaskFactory;
const sequelize_1 = require("sequelize");
function TaskFactory(sequelize) {
    return sequelize.define("Task", {
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
        title: {
            type: sequelize_1.DataTypes.STRING(150),
            allowNull: false,
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
        assigned_to_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        assigned_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "in_progress", "completed"),
            allowNull: false,
            defaultValue: "pending",
        },
        due_date: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        },
        cancelled_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        },
        cancelled_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        cancel_reason: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
    }, {
        tableName: "tasks",
        underscored: true,
        timestamps: true,
    });
}
