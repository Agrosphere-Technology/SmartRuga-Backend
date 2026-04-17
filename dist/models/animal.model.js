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
        current_location_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: true,
        },
        tag_number: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
        },
        rfid_tag: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: true,
            unique: true,
        },
        breed: {
            type: sequelize_1.DataTypes.STRING(120),
            allowNull: true,
        },
        weight: {
            type: sequelize_1.DataTypes.DECIMAL(10, 2),
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
        image_url: {
            type: sequelize_1.DataTypes.TEXT,
            allowNull: true,
        },
        image_public_id: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: true,
        },
    }, {
        tableName: "animals",
        underscored: true,
        timestamps: true,
    });
}
