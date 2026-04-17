"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalMovementEventFactory = AnimalMovementEventFactory;
const sequelize_1 = require("sequelize");
function AnimalMovementEventFactory(sequelize) {
    return sequelize.define("AnimalMovementEvent", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
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
        movement_type: {
            type: sequelize_1.DataTypes.ENUM("to_pasture", "to_quarantine", "to_barn", "to_market", "returned"),
            allowNull: false,
        },
        from_location_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        to_location_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        notes: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        recorded_by: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            unique: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        created_at: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: false,
        },
    }, {
        tableName: "animal_movement_events",
        underscored: true,
        timestamps: false,
    });
}
