"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
exports.UserFactory = UserFactory;
const sequelize_1 = require("sequelize");
class UserModel extends sequelize_1.Model {
}
exports.UserModel = UserModel;
function UserFactory(sequelize) {
    return sequelize.define("User", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },
        first_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
        last_name: { type: sequelize_1.DataTypes.STRING(100), allowNull: true },
        email: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, unique: true },
        password_hash: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
        platform_role: {
            type: sequelize_1.DataTypes.ENUM("user", "admin", "super_admin"),
            allowNull: false,
            defaultValue: "user",
        },
        is_active: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
        deleted_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    }, {
        tableName: "users",
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    });
}
