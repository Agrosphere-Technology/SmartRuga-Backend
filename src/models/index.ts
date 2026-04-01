import { Sequelize } from "sequelize";
import "dotenv/config";
import { UserFactory } from "./user.model";
import { RanchFactory } from "./ranch.model";
import { RanchMemberFactory } from "./ranchMember.model";
import { SpecieFactory } from "./specie.model";
import { InviteFactory } from "./invite.model";
import { RefreshTokenFactory } from "./refreshToken.model";
import { AnimalFactory } from "./animal.model";
import { AnimalHealthEventFactory } from "./animalHealthEvent.model";
import { AnimalActivityEventFactory } from "./animalActivityEvent.model";
import { RanchAlertFactory } from "./ranchAlert.model";
import { AnimalVaccinationFactory } from "./animalVaccination.model";
import { AnimalMovementEventFactory } from "./animalMovementEvent.model";
import { RanchLocationFactory } from "./ranchLocation.model";
import { TaskFactory } from "./task.model";
import { TaskSubmissionFactory } from "./task-submission.model";
import { InventoryItemFactory } from "./inventory-item.model";
import { InventoryStockMovementFactory } from "./inventory-stock-movement.model";

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
export const RanchLocation = RanchLocationFactory(sequelize);
export const AnimalHealthEvent = AnimalHealthEventFactory(sequelize);
export const AnimalActivityEvent = AnimalActivityEventFactory(sequelize);
export const AnimalMovementEvent = AnimalMovementEventFactory(sequelize);
export const RanchAlert = RanchAlertFactory(sequelize);
export const Vaccination = AnimalVaccinationFactory(sequelize);
export const Task = TaskFactory(sequelize);
export const TaskSubmission = TaskSubmissionFactory(sequelize);
export const InventoryItem = InventoryItemFactory(sequelize);
export const InventoryStockMovement = InventoryStockMovementFactory(sequelize);

Task.belongsTo(User, { foreignKey: "assigned_by_user_id", as: "assigner" });

TaskSubmission.belongsTo(User, { foreignKey: "reviewed_by_user_id", as: "reviewer" });

// User ↔ Ranch
User.hasMany(Ranch, { foreignKey: "created_by", as: "createdRanches" });
Ranch.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// Ranch ↔ RanchMember
Ranch.hasMany(RanchMember, { foreignKey: "ranch_id", as: "members" });
RanchMember.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

User.hasMany(RanchMember, { foreignKey: "user_id", as: "memberships" });
RanchMember.belongsTo(User, { foreignKey: "user_id" });

// Ranch ↔ Invite
Ranch.hasMany(Invite, { foreignKey: "ranch_id", as: "invites" });
Invite.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

User.hasMany(Invite, { foreignKey: "created_by", as: "createdInvites" });
Invite.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// User ↔ RefreshToken
User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id" });

// Ranch ↔ Animal
Ranch.hasMany(Animal, { foreignKey: "ranch_id", as: "animals" });
Animal.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

// Species ↔ Animal
Species.hasMany(Animal, { foreignKey: "species_id", as: "animals" });
Animal.belongsTo(Species, { foreignKey: "species_id", as: "species" });

// Ranch ↔ RanchLocation
Ranch.hasMany(RanchLocation, { foreignKey: "ranch_id", as: "locations" });
RanchLocation.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

// RanchLocation ↔ Animal (current location)

RanchLocation.hasMany(Animal, {
  foreignKey: "current_location_id",
  as: "animalsCurrentlyHere",
});

Animal.belongsTo(RanchLocation, {
  foreignKey: "current_location_id",
  as: "currentLocation",
});

// Animal ↔ AnimalHealthEvent

Animal.hasMany(AnimalHealthEvent, {
  foreignKey: "animal_id",
  as: "healthEvents",
});

AnimalHealthEvent.belongsTo(Animal, {
  foreignKey: "animal_id",
  as: "animal",
});

// Animal ↔ AnimalActivityEvent

Animal.hasMany(AnimalActivityEvent, {
  foreignKey: "animal_id",
  as: "activityEvents",
});

AnimalActivityEvent.belongsTo(Animal, {
  foreignKey: "animal_id",
  as: "animal",
});

// User ↔ AnimalActivityEvent

User.hasMany(AnimalActivityEvent, {
  foreignKey: "recorded_by",
  as: "animalActivityEvents",
});

AnimalActivityEvent.belongsTo(User, {
  foreignKey: "recorded_by",
  as: "recorder",
});

// Ranch ↔ RanchAlert

Ranch.hasMany(RanchAlert, { foreignKey: "ranch_id", as: "alerts" });
RanchAlert.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

// Animal ↔ Vaccination

Animal.hasMany(Vaccination, { foreignKey: "animal_id", as: "vaccinations" });
Vaccination.belongsTo(Animal, { foreignKey: "animal_id", as: "animal" });

// Animal ↔ AnimalMovementEvent

Animal.hasMany(AnimalMovementEvent, {
  foreignKey: "animal_id",
  as: "movementEvents",
});

AnimalMovementEvent.belongsTo(Animal, {
  foreignKey: "animal_id",
  as: "animal",
});

// User ↔ AnimalMovementEvent

User.hasMany(AnimalMovementEvent, {
  foreignKey: "recorded_by",
  as: "animalMovementEvents",
});

AnimalMovementEvent.belongsTo(User, {
  foreignKey: "recorded_by",
  as: "recorder",
});

// Ranch ↔ AnimalMovementEvent

Ranch.hasMany(AnimalMovementEvent, {
  foreignKey: "ranch_id",
  as: "movementEvents",
});

AnimalMovementEvent.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});

// RanchLocation ↔ AnimalMovementEvent (from location)

RanchLocation.hasMany(AnimalMovementEvent, {
  foreignKey: "from_location_id",
  as: "outgoingMovements",
});

AnimalMovementEvent.belongsTo(RanchLocation, {
  foreignKey: "from_location_id",
  as: "fromLocation",
});

// RanchLocation ↔ AnimalMovementEvent (to location)

RanchLocation.hasMany(AnimalMovementEvent, {
  foreignKey: "to_location_id",
  as: "incomingMovements",
});

AnimalMovementEvent.belongsTo(RanchLocation, {
  foreignKey: "to_location_id",
  as: "toLocation",
});

// Task ↔ Ranch

Task.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

// Task ↔ User
Task.belongsTo(User, { foreignKey: "assigned_to_user_id", as: "assignedToUser" });
Task.belongsTo(User, { foreignKey: "assigned_by_user_id", as: "assignedByUser" });
Task.belongsTo(User, {
  foreignKey: "cancelled_by_user_id",
  as: "cancelledByUser",
});

Task.hasMany(TaskSubmission, { foreignKey: "task_id", as: "submissions" });

// TaskSubmission ↔ Task
TaskSubmission.belongsTo(Task, { foreignKey: "task_id", as: "task" });

// TaskSubmission ↔ User
TaskSubmission.belongsTo(User, { foreignKey: "submitted_by_user_id", as: "submittedByUser" });
TaskSubmission.belongsTo(User, { foreignKey: "reviewed_by_user_id", as: "reviewedByUser" });


/**
 * ===============================
 * InventoryItem Associations
 * ===============================
 */

// Each inventory item belongs to a ranch
// (multi-tenancy: items are scoped per ranch)
InventoryItem.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});

// Track who created the inventory item
InventoryItem.belongsTo(User, {
  foreignKey: "created_by_user_id",
  as: "createdByUser",
});

// Track who last updated the inventory item
InventoryItem.belongsTo(User, {
  foreignKey: "updated_by_user_id",
  as: "updatedByUser",
});

// One inventory item can have many stock movements
// (audit trail of all stock changes)
InventoryItem.hasMany(InventoryStockMovement, {
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
InventoryStockMovement.belongsTo(InventoryItem, {
  foreignKey: "inventory_item_id",
  as: "inventoryItem",
});

// Track which user recorded the stock movement
// (important for accountability and audit logs)
InventoryStockMovement.belongsTo(User, {
  foreignKey: "recorded_by_user_id",
  as: "recordedByUser",
});

// Each movement is also scoped to a ranch
// (ensures proper multi-tenant isolation)
InventoryStockMovement.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});