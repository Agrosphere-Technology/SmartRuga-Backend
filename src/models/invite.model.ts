import { DataTypes, Sequelize } from "sequelize";

export function InviteFactory(sequelize: Sequelize) {
  return sequelize.define(
    "Invite",
    {
      // Internal DB ID (never expose)
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },

      // ✅ Public identifier (safe to expose)
      // Fix: set defaultValue so Sequelize generates it
      public_id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
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

      // Don't make globally unique
      email: { type: DataTypes.STRING(255), allowNull: false },

      token_hash: { type: DataTypes.STRING(255), allowNull: false },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      created_by: { type: DataTypes.UUID, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "invites",
      underscored: true,
      timestamps: false,
      createdAt: "created_at",
      updatedAt: false,
    }
  );
}