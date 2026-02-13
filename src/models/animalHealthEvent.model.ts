import { DataTypes, Sequelize } from "sequelize";

export function AnimalHealthEventFactory(sequelize: Sequelize) {
    return sequelize.define(
        "AnimalHealthEvent",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            animal_id: { type: DataTypes.UUID, allowNull: false },
            status: {
                type: DataTypes.ENUM(
                    "healthy",
                    "sick",
                    "recovering",
                    "quarantined"
                ),
                allowNull: false,
            },
            notes: { type: DataTypes.TEXT, allowNull: true },
            recorded_by: { type: DataTypes.UUID, allowNull: false },
        },
        {
            tableName: "animal_health_events",
            underscored: true,
            timestamps: false,
            createdAt: "created_at",
            updatedAt: false,
        }
    );
}
