import { DataTypes, Sequelize } from "sequelize";

export function RanchMemberFactory(sequelize: Sequelize) {
  return sequelize.define(
    "RanchMember",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      ranch_id: { type: DataTypes.UUID, allowNull: false },
      user_id: { type: DataTypes.UUID, allowNull: false },
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
      status: {
        type: DataTypes.ENUM("active", "pending", "disabled"),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "ranch_members",
      underscored: true,
      timestamps: true,
    }
  );
}
