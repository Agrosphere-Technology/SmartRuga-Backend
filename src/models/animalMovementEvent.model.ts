import { DataTypes, Sequelize } from "sequelize";

export function AnimalMovementEventFactory(sequelize: Sequelize) {
    return sequelize.define(
        "AnimalMovementEvent",
        {
            id: {
                type: DataTypes.UUID,
                allowNull: false,
                primaryKey: true,
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

            movement_type: {
                type: DataTypes.ENUM(
                    "to_pasture",
                    "to_quarantine",
                    "to_barn",
                    "to_market",
                    "returned"
                ),
                allowNull: false,
            },

            from_location_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            to_location_id: {
                type: DataTypes.UUID,
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
            },
        },
        {
            tableName: "animal_movement_events",
            underscored: true,
            timestamps: false,
        }
    );
}