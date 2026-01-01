import { DataTypes, Sequelize } from "sequelize";

export function RefreshTokenFactory(sequelize: Sequelize) {
  return sequelize.define(
    "RefreshToken",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      token_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
      replaced_by_hash: { type: DataTypes.STRING(255), allowNull: true },
      created_at: { type: DataTypes.DATE, allowNull: false },
    },
    {
      tableName: "refresh_tokens",
      underscored: true,
      timestamps: false,
    }
  );
}
