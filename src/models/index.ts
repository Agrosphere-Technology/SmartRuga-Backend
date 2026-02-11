import { Sequelize } from "sequelize";
import "dotenv/config";
import { UserFactory } from "./user.model";
import { RanchFactory } from "./ranch.model";
import { RanchMemberFactory } from "./ranchMember.model";
import { SpecieFactory } from "./specie.model";
import { InviteFactory } from "./invite.model";
import { RefreshTokenFactory } from "./refreshToken.model";
import { AnimalFactory } from "./animal.model";

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: "postgres",
  logging: false,
  define: {
    freezeTableName: true,
    underscored: true,
  },
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false },
  },
  pool: { max: 5, min: 0, acquire: 30_000, idle: 10_000 },
});

// Models
export const User = UserFactory(sequelize);
export const Ranch = RanchFactory(sequelize);
export const RanchMember = RanchMemberFactory(sequelize);
export const Species = SpecieFactory(sequelize);
export const Invite = InviteFactory(sequelize);
export const RefreshToken = RefreshTokenFactory(sequelize);
export const Animal = AnimalFactory(sequelize);

// Associations
User.hasMany(Ranch, { foreignKey: "created_by", as: "createdRanches" });
Ranch.belongsTo(User, { foreignKey: "created_by", as: "creator" });

Ranch.hasMany(RanchMember, { foreignKey: "ranch_id", as: "members" });
RanchMember.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

User.hasMany(RanchMember, { foreignKey: "user_id", as: "memberships" });
RanchMember.belongsTo(User, { foreignKey: "user_id" });

Ranch.hasMany(Invite, { foreignKey: "ranch_id", as: "invites" });
Invite.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

User.hasMany(Invite, { foreignKey: "created_by", as: "createdInvites" });
Invite.belongsTo(User, { foreignKey: "created_by", as: "creator" });

User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

// Ranch ↔ Animals
Ranch.hasMany(Animal, { foreignKey: "ranch_id", as: "animals" });
Animal.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

// Species ↔ Animals
Species.hasMany(Animal, { foreignKey: "species_id", as: "animals" });
Animal.belongsTo(Species, { foreignKey: "species_id", as: "species" });
