"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalVaccinationFactory = AnimalVaccinationFactory;
const sequelize_1 = require("sequelize");
function AnimalVaccinationFactory(sequelize) {
    return sequelize.define("AnimalVaccination", {
        id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            primaryKey: true,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        public_id: {
            type: sequelize_1.DataTypes.UUID,
            allowNull: false,
            defaultValue: sequelize_1.DataTypes.UUIDV4,
        },
        ranch_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        animal_id: { type: sequelize_1.DataTypes.UUID, allowNull: false },
        vaccine_name: { type: sequelize_1.DataTypes.STRING(120), allowNull: false },
        dose: { type: sequelize_1.DataTypes.STRING(60), allowNull: true },
        administered_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        next_due_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        administered_by: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        notes: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        created_at: { type: sequelize_1.DataTypes.DATE, allowNull: false },
        updated_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        updated_by: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        deleted_at: { type: sequelize_1.DataTypes.DATE, allowNull: true },
        deleted_by: { type: sequelize_1.DataTypes.UUID, allowNull: true },
        delete_reason: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
    }, {
        tableName: "animal_vaccinations",
        underscored: true,
        timestamps: false,
    });
}
