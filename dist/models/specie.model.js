"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecieFactory = SpecieFactory;
const sequelize_1 = require("sequelize");
function SpecieFactory(sequelize) {
    return sequelize.define("Species", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            primaryKey: true,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        name: {
            type: sequelize_1.DataTypes.STRING(100),
            allowNull: false,
            unique: true,
        },
        code: {
            type: sequelize_1.DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },
    }, {
        tableName: "species",
        underscored: true,
        timestamps: true,
    });
}
