import { DataTypes, Sequelize } from "sequelize";

export function TaskSubmissionFactory(sequelize: Sequelize) {
    return sequelize.define(
        "TaskSubmission",
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

            task_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            submitted_by_user_id: {
                type: DataTypes.UUID,
                allowNull: false,
            },

            proof_type: {
                type: DataTypes.ENUM("image", "scan"),
                allowNull: false,
            },

            proof_url: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            image_url: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            image_public_id: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            status: {
                type: DataTypes.ENUM("pending", "approved", "rejected"),
                allowNull: false,
                defaultValue: "pending",
            },

            review_notes: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            reviewed_by_user_id: {
                type: DataTypes.UUID,
                allowNull: true,
            },

            reviewed_at: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: "task_submissions",
            underscored: true,
            timestamps: true,
        }
    );
}