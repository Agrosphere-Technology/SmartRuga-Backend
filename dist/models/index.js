"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimalHealthEvent = exports.Animal = exports.RefreshToken = exports.Invite = exports.Species = exports.RanchMember = exports.Ranch = exports.User = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
require("dotenv/config");
const user_model_1 = require("./user.model");
const ranch_model_1 = require("./ranch.model");
const ranchMember_model_1 = require("./ranchMember.model");
const specie_model_1 = require("./specie.model");
const invite_model_1 = require("./invite.model");
const refreshToken_model_1 = require("./refreshToken.model");
const animal_model_1 = require("./animal.model");
const animalHealthEvent_model_1 = require("./animalHealthEvent.model");
exports.sequelize = new sequelize_1.Sequelize(process.env.DATABASE_URL, {
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
exports.User = (0, user_model_1.UserFactory)(exports.sequelize);
exports.Ranch = (0, ranch_model_1.RanchFactory)(exports.sequelize);
exports.RanchMember = (0, ranchMember_model_1.RanchMemberFactory)(exports.sequelize);
exports.Species = (0, specie_model_1.SpecieFactory)(exports.sequelize);
exports.Invite = (0, invite_model_1.InviteFactory)(exports.sequelize);
exports.RefreshToken = (0, refreshToken_model_1.RefreshTokenFactory)(exports.sequelize);
exports.Animal = (0, animal_model_1.AnimalFactory)(exports.sequelize);
exports.AnimalHealthEvent = (0, animalHealthEvent_model_1.AnimalHealthEventFactory)(exports.sequelize);
// Associations
exports.User.hasMany(exports.Ranch, { foreignKey: "created_by", as: "createdRanches" });
exports.Ranch.belongsTo(exports.User, { foreignKey: "created_by", as: "creator" });
exports.Ranch.hasMany(exports.RanchMember, { foreignKey: "ranch_id", as: "members" });
exports.RanchMember.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
exports.User.hasMany(exports.RanchMember, { foreignKey: "user_id", as: "memberships" });
exports.RanchMember.belongsTo(exports.User, { foreignKey: "user_id" });
exports.Ranch.hasMany(exports.Invite, { foreignKey: "ranch_id", as: "invites" });
exports.Invite.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
exports.User.hasMany(exports.Invite, { foreignKey: "created_by", as: "createdInvites" });
exports.Invite.belongsTo(exports.User, { foreignKey: "created_by", as: "creator" });
exports.User.hasMany(exports.RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
exports.RefreshToken.belongsTo(exports.User, { foreignKey: "user_id" });
// Ranch ↔ Animals
exports.Ranch.hasMany(exports.Animal, { foreignKey: "ranch_id", as: "animals" });
exports.Animal.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
// Species ↔ Animals
exports.Species.hasMany(exports.Animal, { foreignKey: "species_id", as: "animals" });
exports.Animal.belongsTo(exports.Species, { foreignKey: "species_id", as: "species" });
exports.Animal.hasMany(exports.AnimalHealthEvent, { foreignKey: "animal_id", as: "healthEvents" });
exports.AnimalHealthEvent.belongsTo(exports.Animal, { foreignKey: "animal_id", as: "animal" });
