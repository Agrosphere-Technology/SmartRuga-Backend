"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteFactory = InviteFactory;
const sequelize_1 = require("sequelize");
function InviteFactory(sequelize) {
    return sequelize.define("Invite", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        ranch_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        role: {
            type: sequelize_1.DataTypes.ENUM("owner", "manager", "vet", "storekeeper", "worker"),
            allowNull: false,
        },
        // The email address the invite was sent to
        email: { type: sequelize_1.DataTypes.STRING(255), allowNull: false, unique: true },
        token_hash: { type: sequelize_1.DataTypes.STRING(255), allowNull: false },
        expires_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        created_by: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        used_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
    }, {
        tableName: "invites",
        underscored: true,
        timestamps: false, // this table only has created_at in migration
        createdAt: "created_at",
        updatedAt: false,
    });
}
