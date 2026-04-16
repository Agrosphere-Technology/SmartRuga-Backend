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

      current_location_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      tag_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      rfid_tag: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },

      breed: {
        type: DataTypes.STRING(120),
        allowNull: true,
      },

      weight: {
        type: DataTypes.DECIMAL(10, 2),
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

      image_url: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      image_public_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
    },
    {
      tableName: "animals",
      underscored: true,
      timestamps: true,
    }
  );
}