import { DataTypes, Sequelize } from "sequelize";

export function AnimalVaccinationFactory(sequelize: Sequelize) {
    return sequelize.define(
        "AnimalVaccination",
        {
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
                defaultValue: DataTypes.UUIDV4,
            },
            public_id: {
                type: DataTypes.UUID,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            ranch_id: { type: DataTypes.UUID, allowNull: false },
            animal_id: { type: DataTypes.UUID, allowNull: false },
            vaccine_name: { type: DataTypes.STRING(120), allowNull: false },
            dose: { type: DataTypes.STRING(60), allowNull: true },
            administered_at: { type: DataTypes.DATE, allowNull: false },
            next_due_at: { type: DataTypes.DATE, allowNull: true },
            administered_by: { type: DataTypes.UUID, allowNull: true },
            notes: { type: DataTypes.TEXT, allowNull: true },
            created_at: { type: DataTypes.DATE, allowNull: false },
        },
        {
            tableName: "animal_vaccinations",
            underscored: true,
            timestamps: false,
        }
    );
}