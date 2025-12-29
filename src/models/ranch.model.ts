import { DataTypes, Sequelize } from "sequelize";

export function RanchFactory(sequelize: Sequelize) {
  return sequelize.define(
    "Ranch",
    {
      id: { type: DataTypes.UUID, primaryKey: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      created_by: { type: DataTypes.UUID, allowNull: false },
    },
    {
      tableName: "ranches",
      underscored: true,
      timestamps: true,
    }
  );
}
