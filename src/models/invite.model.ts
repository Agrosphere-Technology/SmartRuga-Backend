import { DataTypes, Sequelize } from "sequelize";

export function InviteFactory(sequelize: Sequelize) {
  return sequelize.define(
    "Invite",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      ranch_id: { type: DataTypes.UUID, allowNull: false },
      role: {
        type: DataTypes.ENUM(
          "owner",
          "manager",
          "vet",
          "storekeeper",
          "worker"
        ),
        allowNull: false,
      },
      // The email address the invite was sent to
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      token_hash: { type: DataTypes.STRING(255), allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      created_by: { type: DataTypes.UUID, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "invites",
      underscored: true,
      timestamps: false, // this table only has created_at in migration
      createdAt: "created_at",
      updatedAt: false,
    }
  );
}
