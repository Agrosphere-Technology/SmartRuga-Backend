"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConcernFactory = ConcernFactory;
const sequelize_1 = require("sequelize");
function ConcernFactory(sequelize) {
    return sequelize.define("Concern", {
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
        raised_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        assigned_to_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        category: {
            type: sequelize_1.DataTypes.ENUM("health", "inventory", "animal", "facility", "security", "task", "other"),
            allowNull: false,
            defaultValue: "other",
        },
        title: {
            type: sequelize_1.DataTypes.STRING(150),
            allowNull: false,
        },
        description: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: false,
        },
        priority: {
            type: sequelize_1.DataTypes.ENUM("low", "medium", "high", "urgent"),
            allowNull: false,
            defaultValue: "medium",
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("open", "in_review", "resolved", "dismissed"),
            allowNull: false,
            defaultValue: "open",
        },
        entity_type: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        entity_public_id: {
            type: sequelize_1.DataTypes.UUID,
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
        resolution_notes: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        resolved_by_user_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        resolved_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        },
    }, {
        tableName: "concerns",
        underscored: true,
        timestamps: true,
    });
}
