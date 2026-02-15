"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshTokenFactory = RefreshTokenFactory;
const sequelize_1 = require("sequelize");
function RefreshTokenFactory(sequelize) {
    return sequelize.define("RefreshToken", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        token_hash: {
            type: sequelize_1.DataTypes.STRING(255),
            allowNull: false,
            unique: true,
        },
        expires_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        revoked_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        replaced_by_hash: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
        created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
    }, {
        tableName: "refresh_tokens",
        underscored: true,
        timestamps: false,
    });
}
