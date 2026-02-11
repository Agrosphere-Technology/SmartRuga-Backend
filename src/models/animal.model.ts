import { DataTypes, Sequelize } from "sequelize";

export function AnimalFactory(sequelize: Sequelize) {
  return sequelize.define(
    "Animal",
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },

      // QR identity (safe public identifier)
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

      species_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      tag_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      sex: {
        type: DataTypes.ENUM("male", "female", "unknown"),
        allowNull: false,
        defaultValue: "unknown",
      },

      date_of_birth: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("active", "sold", "deceased"),
        allowNull: false,
        defaultValue: "active",
      },
    },
    {
      tableName: "animals",
      underscored: true,
      timestamps: true,
    },
  );
}
