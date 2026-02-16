import { DataTypes, Sequelize } from "sequelize";

export function AnimalActivityEventFactory(sequelize: Sequelize) {
    return sequelize.define(
        "AnimalActivityEvent",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },
            ranch_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            animal_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            event_type: {
                type: DataTypes.ENUM("animal_update"),
                allowNull: false,
                defaultValue: "animal_update",
            },
            field: {
                type: DataTypes.STRING(50),
                allowNull: false,
            },
            from_value: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            to_value: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            recorded_by: {
                type: DataTypes.UUID,
                allowNull: false,
            },
            created_at: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "animal_activity_events",
            underscored: true,
            timestamps: false,
        }
    );
}
