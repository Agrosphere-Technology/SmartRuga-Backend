"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalHealthEventFactory = AnimalHealthEventFactory;
const sequelize_1 = require("sequelize");
function AnimalHealthEventFactory(sequelize) {
    return sequelize.define("AnimalHealthEvent", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        animal_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        status: {
            type: sequelize_1.DataTypes.ENUM("healthy", "sick", "recovering", "quarantined"),
            allowNull: false,
        },
        notes: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        recorded_by: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    }, {
        tableName: "animal_health_events",
        underscored: true,
        timestamps: false,
        createdAt: "created_at",
        updatedAt: false,
    });
}
