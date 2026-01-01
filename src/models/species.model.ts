import { DataTypes, Sequelize } from "sequelize";

export function SpeciesFactory(sequelize: Sequelize) {
  return sequelize.define(
    "Species",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      name: { type: DataTypes.STRING(100), allowNull: false },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    },
    {
      tableName: "species",
      underscored: true,
      timestamps: true,
    }
  );
}
