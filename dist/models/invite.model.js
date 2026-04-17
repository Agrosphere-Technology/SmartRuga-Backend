"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteFactory = InviteFactory;
const sequelize_1 = require("sequelize");
function InviteFactory(sequelize) {
    return sequelize.define("Invite", {
        // Internal DB ID (never expose)
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        // ✅ Public identifier (safe to expose)
        // Fix: set defaultValue so Sequelize generates it
        public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        ranch_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        role: {
            type: sequelize_1.DataTypes.ENUM("owner", "manager", "vet", "storekeeper", "worker"),
            allowNull: false,
        },
        // Don't make globally unique
        email: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
        token_hash: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
        expires_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        created_by: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        used_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    }, {
        tableName: "invites",
        underscored: true,
        timestamps: false,
        createdAt: "created_at",
        updatedAt: false,
    });
}
