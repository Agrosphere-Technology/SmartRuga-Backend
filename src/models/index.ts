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
import { ConcernFactory } from "./concern.model";

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
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
});

// ===============================
// MODELS
// ===============================
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
export const Concern = ConcernFactory(sequelize);

// ===============================
// USER ↔ RANCH
// ===============================
User.hasMany(Ranch, { foreignKey: "created_by", as: "createdRanches" });
Ranch.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// ===============================
// RANCH ↔ MEMBERS
// ===============================
Ranch.hasMany(RanchMember, { foreignKey: "ranch_id", as: "members" });

RanchMember.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});

User.hasMany(RanchMember, {
  foreignKey: "user_id",
  as: "memberships",
});

RanchMember.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// ===============================
// INVITES
// ===============================
Ranch.hasMany(Invite, { foreignKey: "ranch_id", as: "invites" });
Invite.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

User.hasMany(Invite, { foreignKey: "created_by", as: "createdInvites" });
Invite.belongsTo(User, { foreignKey: "created_by", as: "creator" });

// ===============================
// REFRESH TOKENS
// ===============================
User.hasMany(RefreshToken, { foreignKey: "user_id", as: "refreshTokens" });
RefreshToken.belongsTo(User, { foreignKey: "user_id", as: "user" });

// ===============================
// ANIMALS
// ===============================
Ranch.hasMany(Animal, { foreignKey: "ranch_id", as: "animals" });
Animal.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

Species.hasMany(Animal, { foreignKey: "species_id", as: "animals" });
Animal.belongsTo(Species, { foreignKey: "species_id", as: "species" });

// ===============================
// LOCATIONS
// ===============================
Ranch.hasMany(RanchLocation, { foreignKey: "ranch_id", as: "locations" });
RanchLocation.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

RanchLocation.hasMany(Animal, {
  foreignKey: "current_location_id",
  as: "animalsCurrentlyHere",
});

Animal.belongsTo(RanchLocation, {
  foreignKey: "current_location_id",
  as: "currentLocation",
});

// ===============================
// HEALTH EVENTS
// ===============================
Animal.hasMany(AnimalHealthEvent, {
  foreignKey: "animal_id",
  as: "healthEvents",
});

AnimalHealthEvent.belongsTo(Animal, {
  foreignKey: "animal_id",
  as: "animal",
});

// ===============================
// ACTIVITY EVENTS
// ===============================
Animal.hasMany(AnimalActivityEvent, {
  foreignKey: "animal_id",
  as: "activityEvents",
});

AnimalActivityEvent.belongsTo(Animal, {
  foreignKey: "animal_id",
  as: "animal",
});

User.hasMany(AnimalActivityEvent, {
  foreignKey: "recorded_by",
  as: "animalActivityEvents",
});

AnimalActivityEvent.belongsTo(User, {
  foreignKey: "recorded_by",
  as: "recorder",
});

// ===============================
// ALERTS
// ===============================
Ranch.hasMany(RanchAlert, { foreignKey: "ranch_id", as: "alerts" });
RanchAlert.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

Animal.hasMany(RanchAlert, { foreignKey: "animal_id", as: "alerts" });
RanchAlert.belongsTo(Animal, { foreignKey: "animal_id", as: "animal" });

User.hasMany(RanchAlert, { foreignKey: "read_by", as: "readAlerts" });
RanchAlert.belongsTo(User, { foreignKey: "read_by", as: "readByUser" });

// ===============================
// VACCINATIONS
// ===============================
Animal.hasMany(Vaccination, { foreignKey: "animal_id", as: "vaccinations" });
Vaccination.belongsTo(Animal, { foreignKey: "animal_id", as: "animal" });

// ===============================
// MOVEMENT EVENTS
// ===============================
Animal.hasMany(AnimalMovementEvent, {
  foreignKey: "animal_id",
  as: "movementEvents",
});

AnimalMovementEvent.belongsTo(Animal, {
  foreignKey: "animal_id",
  as: "animal",
});

User.hasMany(AnimalMovementEvent, {
  foreignKey: "recorded_by",
  as: "animalMovementEvents",
});

AnimalMovementEvent.belongsTo(User, {
  foreignKey: "recorded_by",
  as: "recorder",
});

Ranch.hasMany(AnimalMovementEvent, {
  foreignKey: "ranch_id",
  as: "movementEvents",
});

AnimalMovementEvent.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});

RanchLocation.hasMany(AnimalMovementEvent, {
  foreignKey: "from_location_id",
  as: "outgoingMovements",
});

AnimalMovementEvent.belongsTo(RanchLocation, {
  foreignKey: "from_location_id",
  as: "fromLocation",
});

RanchLocation.hasMany(AnimalMovementEvent, {
  foreignKey: "to_location_id",
  as: "incomingMovements",
});

AnimalMovementEvent.belongsTo(RanchLocation, {
  foreignKey: "to_location_id",
  as: "toLocation",
});

// ===============================
// TASKS
// ===============================
Task.belongsTo(Ranch, { foreignKey: "ranch_id", as: "ranch" });

Task.belongsTo(User, {
  foreignKey: "assigned_to_user_id",
  as: "assignedToUser",
});

Task.belongsTo(User, {
  foreignKey: "assigned_by_user_id",
  as: "assignedByUser",
});

Task.belongsTo(User, {
  foreignKey: "cancelled_by_user_id",
  as: "cancelledByUser",
});

Task.hasMany(TaskSubmission, {
  foreignKey: "task_id",
  as: "submissions",
});

TaskSubmission.belongsTo(Task, {
  foreignKey: "task_id",
  as: "task",
});

TaskSubmission.belongsTo(User, {
  foreignKey: "submitted_by_user_id",
  as: "submittedByUser",
});

TaskSubmission.belongsTo(User, {
  foreignKey: "reviewed_by_user_id",
  as: "reviewedByUser",
});

// ===============================
// INVENTORY
// ===============================
InventoryItem.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});

InventoryItem.belongsTo(User, {
  foreignKey: "created_by_user_id",
  as: "createdByUser",
});

InventoryItem.belongsTo(User, {
  foreignKey: "updated_by_user_id",
  as: "updatedByUser",
});

InventoryItem.hasMany(InventoryStockMovement, {
  foreignKey: "inventory_item_id",
  as: "stockMovements",
});

InventoryStockMovement.belongsTo(InventoryItem, {
  foreignKey: "inventory_item_id",
  as: "inventoryItem",
});

InventoryStockMovement.belongsTo(User, {
  foreignKey: "recorded_by_user_id",
  as: "recordedByUser",
});

InventoryStockMovement.belongsTo(Ranch, {
  foreignKey: "ranch_id",
  as: "ranch",
});

// ===============================
// CONCERNS
// ===============================
Concern.belongsTo(User, {
  foreignKey: "raised_by_user_id",
  as: "raisedByUser",
});

Concern.belongsTo(User, {
  foreignKey: "assigned_to_user_id",
  as: "assignedToUser",
});

Concern.belongsTo(User, {
  foreignKey: "resolved_by_user_id",
  as: "resolvedByUser",
});

User.hasMany(Concern, {
  foreignKey: "raised_by_user_id",
  as: "raisedConcerns",
});

User.hasMany(Concern, {
  foreignKey: "assigned_to_user_id",
  as: "assignedConcerns",
});

User.hasMany(Concern, {
  foreignKey: "resolved_by_user_id",
  as: "resolvedConcerns",
});