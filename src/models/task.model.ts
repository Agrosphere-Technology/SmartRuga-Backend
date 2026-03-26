import { DataTypes, Sequelize } from "sequelize";

export function TaskFactory(sequelize: Sequelize) {
    return sequelize.define(
        "Task",
        {
            id: {
                type: DataTypes.UUID,
                primaryKey: true,
                allowNull: false,
                defaultValue: DataTypes.UUIDV4,
            },

            public_id: {
                type: DataTypes.UUID,
                allowNull: false,
                unique: true,
                defaultValue: DataTypes.UUIDV4,
            },

            ranch_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            title: {
                type: DataTypes.STRING(150),
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            assigned_to_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            assigned_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            status: {
                type: DataTypes.ENUM("pending", "in_progress", "completed"),
                allowNull: false,
                defaultValue: "pending",
            },

            due_date: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: "tasks",
            underscored: true,
            timestamps: true,
        }
    );
}