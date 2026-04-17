"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskSubmissionFactory = TaskSubmissionFactory;
const sequelize_1 = require("sequelize");
function TaskSubmissionFactory(sequelize) {
    return sequelize.define("TaskSubmission", {
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
        task_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        submitted_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        proof_type: {
            type: sequelize_1.DataTypes.ENUM("image", "scan"),
            allowNull: false,
        },
        proof_url: {
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
        notes: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("pending", "approved", "rejected"),
            allowNull: false,
            defaultValue: "pending",
        },
        review_notes: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        reviewed_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        reviewed_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: "task_submissions",
        underscored: true,
        timestamps: true,
    });
}
