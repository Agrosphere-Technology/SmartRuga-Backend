"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RanchFactory = RanchFactory;
const sequelize_1 = require("sequelize");
function RanchFactory(sequelize) {
    return sequelize.define("Ranch", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        name: { type: sequelize_1.DataTypes.STRING(150), allowNull: false },
        slug: { type: sequelize_1.DataTypes.STRING(120), allowNull: false, unique: true },
        created_by: { type: sequelize_1.DataTypes.UUID, allowNull: false },
    }, {
        tableName: "ranches",
        underscored: true,
        timestamps: true,
    });
}
