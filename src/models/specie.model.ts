import { DataTypes, Sequelize } from "sequelize";

export function SpecieFactory(sequelize: Sequelize) {
  return sequelize.define(
    "Species",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "species",
      underscored: true,
      timestamps: true,
    },
  );
}
