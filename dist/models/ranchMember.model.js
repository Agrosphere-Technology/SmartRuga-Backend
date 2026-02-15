"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RanchMemberFactory = RanchMemberFactory;
const sequelize_1 = require("sequelize");
function RanchMemberFactory(sequelize) {
    return sequelize.define("RanchMember", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
            allowNull: false,
            primaryKey: true,
        },
        ranch_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        user_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        role: {
            type: sequelize_1.DataTypes.ENUM("owner", "manager", "vet", "storekeeper", "worker"),
            allowNull: false,
        },
        status: {
            type: sequelize_1.DataTypes.ENUM("active", "pending", "disabled"),
            allowNull: false,
            defaultValue: "pending",
        },
    }, {
        tableName: "ranch_members",
        underscored: true,
        timestamps: true,
    });
}
