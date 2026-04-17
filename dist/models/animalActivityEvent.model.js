"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalActivityEventFactory = AnimalActivityEventFactory;
const sequelize_1 = require("sequelize");
function AnimalActivityEventFactory(sequelize) {
    return sequelize.define("AnimalActivityEvent", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        ranch_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        animal_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        event_type: {
            type: sequelize_1.DataTypes.ENUM("animal_update"),
            allowNull: false,
            defaultValue: "animal_update",
        },
        field: {
            type: sequelize_1.DataTypes.STRING(50),
            allowNull: false,
        },
        from_value: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        to_value: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            unique: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        notes: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        recorded_by: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        created_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.NOW,
        },
    }, {
        tableName: "animal_activity_events",
        underscored: true,
        timestamps: false,
    });
}
