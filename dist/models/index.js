"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Concern = exports.InventoryStockMovement = exports.InventoryItem = exports.TaskSubmission = exports.Task = exports.Vaccination = exports.RanchAlert = exports.AnimalMovementEvent = exports.AnimalActivityEvent = exports.AnimalHealthEvent = exports.RanchLocation = exports.Animal = exports.RefreshToken = exports.Invite = exports.Species = exports.RanchMember = exports.Ranch = exports.User = exports.sequelize = void 0;
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
const animalActivityEvent_model_1 = require("./animalActivityEvent.model");
const ranchAlert_model_1 = require("./ranchAlert.model");
const animalVaccination_model_1 = require("./animalVaccination.model");
const animalMovementEvent_model_1 = require("./animalMovementEvent.model");
const ranchLocation_model_1 = require("./ranchLocation.model");
const task_model_1 = require("./task.model");
const task_submission_model_1 = require("./task-submission.model");
const inventory_item_model_1 = require("./inventory-item.model");
const inventory_stock_movement_model_1 = require("./inventory-stock-movement.model");
const concern_model_1 = require("./concern.model");
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
exports.RanchLocation = (0, ranchLocation_model_1.RanchLocationFactory)(exports.sequelize);
exports.AnimalHealthEvent = (0, animalHealthEvent_model_1.AnimalHealthEventFactory)(exports.sequelize);
exports.AnimalActivityEvent = (0, animalActivityEvent_model_1.AnimalActivityEventFactory)(exports.sequelize);
exports.AnimalMovementEvent = (0, animalMovementEvent_model_1.AnimalMovementEventFactory)(exports.sequelize);
exports.RanchAlert = (0, ranchAlert_model_1.RanchAlertFactory)(exports.sequelize);
exports.Vaccination = (0, animalVaccination_model_1.AnimalVaccinationFactory)(exports.sequelize);
exports.Task = (0, task_model_1.TaskFactory)(exports.sequelize);
exports.TaskSubmission = (0, task_submission_model_1.TaskSubmissionFactory)(exports.sequelize);
exports.InventoryItem = (0, inventory_item_model_1.InventoryItemFactory)(exports.sequelize);
exports.InventoryStockMovement = (0, inventory_stock_movement_model_1.InventoryStockMovementFactory)(exports.sequelize);
exports.Concern = (0, concern_model_1.ConcernFactory)(exports.sequelize);
exports.Task.belongsTo(exports.User, { foreignKey: "assigned_by_user_id", as: "assigner" });
exports.TaskSubmission.belongsTo(exports.User, { foreignKey: "reviewed_by_user_id", as: "reviewer" });
// User ↔ Ranch
exports.User.hasMany(exports.Ranch, { foreignKey: "created_by", as: "createdRanches" });
exports.Ranch.belongsTo(exports.User, { foreignKey: "created_by", as: "creator" });
// Ranch ↔ RanchMember
exports.Ranch.hasMany(exports.RanchMember, { foreignKey: "ranch_id", as: "members" });
exports.RanchMember.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
exports.User.hasMany(exports.RanchMember, { foreignKey: "user_id", as: "memberships" });
exports.RanchMember.belongsTo(exports.User, { foreignKey: "user_id" });
// Ranch ↔ Invite
exports.Ranch.hasMany(exports.Invite, { foreignKey: "ranch_id", as: "invites" });
exports.Invite.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
exports.User.hasMany(exports.Invite, { foreignKey: "created_by", as: "createdInvites" });
exports.Invite.belongsTo(exports.User, { foreignKey: "created_by", as: "creator" });
// User ↔ RefreshToken
exports.User.hasMany(exports.RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
exports.RefreshToken.belongsTo(exports.User, { foreignKey: "user_id" });
// Ranch ↔ Animal
exports.Ranch.hasMany(exports.Animal, { foreignKey: "ranch_id", as: "animals" });
exports.Animal.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
// Species ↔ Animal
exports.Species.hasMany(exports.Animal, { foreignKey: "species_id", as: "animals" });
exports.Animal.belongsTo(exports.Species, { foreignKey: "species_id", as: "species" });
// Ranch ↔ RanchLocation
exports.Ranch.hasMany(exports.RanchLocation, { foreignKey: "ranch_id", as: "locations" });
exports.RanchLocation.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
// RanchLocation ↔ Animal (current location)
exports.RanchLocation.hasMany(exports.Animal, {
    foreignKey: "current_location_id",
    as: "animalsCurrentlyHere",
});
exports.Animal.belongsTo(exports.RanchLocation, {
    foreignKey: "current_location_id",
    as: "currentLocation",
});
// Animal ↔ AnimalHealthEvent
exports.Animal.hasMany(exports.AnimalHealthEvent, {
    foreignKey: "animal_id",
    as: "healthEvents",
});
exports.AnimalHealthEvent.belongsTo(exports.Animal, {
    foreignKey: "animal_id",
    as: "animal",
});
// Animal ↔ AnimalActivityEvent
exports.Animal.hasMany(exports.AnimalActivityEvent, {
    foreignKey: "animal_id",
    as: "activityEvents",
});
exports.AnimalActivityEvent.belongsTo(exports.Animal, {
    foreignKey: "animal_id",
    as: "animal",
});
// User ↔ AnimalActivityEvent
exports.User.hasMany(exports.AnimalActivityEvent, {
    foreignKey: "recorded_by",
    as: "animalActivityEvents",
});
exports.AnimalActivityEvent.belongsTo(exports.User, {
    foreignKey: "recorded_by",
    as: "recorder",
});
// Ranch ↔ RanchAlert
exports.Ranch.hasMany(exports.RanchAlert, { foreignKey: "ranch_id", as: "alerts" });
exports.RanchAlert.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
// Animal ↔ Vaccination
exports.Animal.hasMany(exports.Vaccination, { foreignKey: "animal_id", as: "vaccinations" });
exports.Vaccination.belongsTo(exports.Animal, { foreignKey: "animal_id", as: "animal" });
exports.RanchAlert.belongsTo(exports.Animal, {
    foreignKey: "animal_id",
    as: "animal",
});
exports.RanchAlert.belongsTo(exports.User, {
    foreignKey: "read_by",
    as: "readByUser",
});
exports.Animal.hasMany(exports.RanchAlert, {
    foreignKey: "animal_id",
    as: "alerts",
});
exports.User.hasMany(exports.RanchAlert, {
    foreignKey: "read_by",
    as: "readAlerts",
});
// Animal ↔ AnimalMovementEvent
exports.Animal.hasMany(exports.AnimalMovementEvent, {
    foreignKey: "animal_id",
    as: "movementEvents",
});
exports.AnimalMovementEvent.belongsTo(exports.Animal, {
    foreignKey: "animal_id",
    as: "animal",
});
// User ↔ AnimalMovementEvent
exports.User.hasMany(exports.AnimalMovementEvent, {
    foreignKey: "recorded_by",
    as: "animalMovementEvents",
});
exports.AnimalMovementEvent.belongsTo(exports.User, {
    foreignKey: "recorded_by",
    as: "recorder",
});
// Ranch ↔ AnimalMovementEvent
exports.Ranch.hasMany(exports.AnimalMovementEvent, {
    foreignKey: "ranch_id",
    as: "movementEvents",
});
exports.AnimalMovementEvent.belongsTo(exports.Ranch, {
    foreignKey: "ranch_id",
    as: "ranch",
});
// RanchLocation ↔ AnimalMovementEvent (from location)
exports.RanchLocation.hasMany(exports.AnimalMovementEvent, {
    foreignKey: "from_location_id",
    as: "outgoingMovements",
});
exports.AnimalMovementEvent.belongsTo(exports.RanchLocation, {
    foreignKey: "from_location_id",
    as: "fromLocation",
});
// RanchLocation ↔ AnimalMovementEvent (to location)
exports.RanchLocation.hasMany(exports.AnimalMovementEvent, {
    foreignKey: "to_location_id",
    as: "incomingMovements",
});
exports.AnimalMovementEvent.belongsTo(exports.RanchLocation, {
    foreignKey: "to_location_id",
    as: "toLocation",
});
// Task ↔ Ranch
exports.Task.belongsTo(exports.Ranch, { foreignKey: "ranch_id", as: "ranch" });
// Task ↔ User
exports.Task.belongsTo(exports.User, { foreignKey: "assigned_to_user_id", as: "assignedToUser" });
exports.Task.belongsTo(exports.User, { foreignKey: "assigned_by_user_id", as: "assignedByUser" });
exports.Task.belongsTo(exports.User, {
    foreignKey: "cancelled_by_user_id",
    as: "cancelledByUser",
});
exports.Task.hasMany(exports.TaskSubmission, { foreignKey: "task_id", as: "submissions" });
// TaskSubmission ↔ Task
exports.TaskSubmission.belongsTo(exports.Task, { foreignKey: "task_id", as: "task" });
// TaskSubmission ↔ User
exports.TaskSubmission.belongsTo(exports.User, { foreignKey: "submitted_by_user_id", as: "submittedByUser" });
exports.TaskSubmission.belongsTo(exports.User, { foreignKey: "reviewed_by_user_id", as: "reviewedByUser" });
/**
 * ===============================
 * InventoryItem Associations
 * ===============================
 */
// Each inventory item belongs to a ranch
// (multi-tenancy: items are scoped per ranch)
exports.InventoryItem.belongsTo(exports.Ranch, {
    foreignKey: "ranch_id",
    as: "ranch",
});
// Track who created the inventory item
exports.InventoryItem.belongsTo(exports.User, {
    foreignKey: "created_by_user_id",
    as: "createdByUser",
});
// Track who last updated the inventory item
exports.InventoryItem.belongsTo(exports.User, {
    foreignKey: "updated_by_user_id",
    as: "updatedByUser",
});
// One inventory item can have many stock movements
// (audit trail of all stock changes)
exports.InventoryItem.hasMany(exports.InventoryStockMovement, {
    foreignKey: "inventory_item_id",
    as: "stockMovements",
});
/**
 * ===============================
 * InventoryStockMovement Associations
 * ===============================
 */
// Each stock movement belongs to an inventory item
// (e.g., stock_in, stock_out, adjustment)
exports.InventoryStockMovement.belongsTo(exports.InventoryItem, {
    foreignKey: "inventory_item_id",
    as: "inventoryItem",
});
// Track which user recorded the stock movement
// (important for accountability and audit logs)
exports.InventoryStockMovement.belongsTo(exports.User, {
    foreignKey: "recorded_by_user_id",
    as: "recordedByUser",
});
// Each movement is also scoped to a ranch
// (ensures proper multi-tenant isolation)
exports.InventoryStockMovement.belongsTo(exports.Ranch, {
    foreignKey: "ranch_id",
    as: "ranch",
});
/////// Concern <=> Association  /////////
// Concern associations
exports.Concern.belongsTo(exports.User, {
    foreignKey: "raised_by_user_id",
    as: "raisedByUser",
});
exports.Concern.belongsTo(exports.User, {
    foreignKey: "assigned_to_user_id",
    as: "assignedToUser",
});
exports.Concern.belongsTo(exports.User, {
    foreignKey: "resolved_by_user_id",
    as: "resolvedByUser",
});
exports.User.hasMany(exports.Concern, {
    foreignKey: "raised_by_user_id",
    as: "raisedConcerns",
});
exports.User.hasMany(exports.Concern, {
    foreignKey: "assigned_to_user_id",
    as: "assignedConcerns",
});
exports.User.hasMany(exports.Concern, {
    foreignKey: "resolved_by_user_id",
    as: "resolvedConcerns",
});
