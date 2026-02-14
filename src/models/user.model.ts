import {
  DataTypes,
  Sequelize,
  Model,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";

export class UserModel extends Model<
  InferAttributes<UserModel>,
  InferCreationAttributes<UserModel>
> {
  declare id: string;
  declare first_name: string | null;
  declare last_name: string | null;
  declare email: string;
  declare password_hash: string;
  declare platform_role: "user" | "admin" | "super_admin";
  declare is_active: boolean;
  declare deleted_at: Date | null;
}

export function UserFactory(sequelize: Sequelize) {
  return sequelize.define<UserModel>(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      first_name: { type: DataTypes.STRING(100), allowNull: true },
      last_name: { type: DataTypes.STRING(100), allowNull: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      platform_role: {
        type: DataTypes.ENUM("user", "admin", "super_admin"),
        allowNull: false,
        defaultValue: "user",
      },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      tableName: "users",
      underscored: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );
}
