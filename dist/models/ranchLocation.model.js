"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RanchLocationFactory = RanchLocationFactory;
const sequelize_1 = require("sequelize");
function RanchLocationFactory(sequelize) {
    return sequelize.define("RanchLocation", {
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
        name: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
        },
        code: {
            type: sequelize_1.DataTypes.STRING(50),
            allowNull: true,
        },
        location_type: {
            type: sequelize_1.DataTypes.ENUM("barn", "pen", "pasture", "quarantine", "clinic", "loading_bay", "market", "external", "other"),
            allowNull: false,
            defaultValue: "other",
        },
        description: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        is_active: {
            type: sequelize_1.DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    }, {
        tableName: "ranch_locations",
        underscored: true,
        timestamps: true,
    });
}
