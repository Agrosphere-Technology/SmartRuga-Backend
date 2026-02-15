"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalFactory = AnimalFactory;
const sequelize_1 = require("sequelize");
function AnimalFactory(sequelize) {
    return sequelize.define("Animal", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        // QR identity (safe public identifier)
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
        species_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
        },
        tag_number: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        sex: {
            type: sequelize_1.DataTypes.ENUM("male", "female", "unknown"),
            allowNull: false,
            defaultValue: "unknown",
        },
        date_of_birth: {
            type: sequelize_1.DataTypes.DATE,
            allowNull: true,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("active", "sold", "deceased"),
            allowNull: false,
            defaultValue: "active",
        },
    }, {
        tableName: "animals",
        underscored: true,
        timestamps: true,
    });
}
