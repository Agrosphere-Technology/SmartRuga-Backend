export const PLATFORM_ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export const RANCH_ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  VET: "vet",
  STOREKEEPER: "storekeeper",
  WORKER: "worker",
} as const;

export const MEMBERSHIP_STATUS = {
  ACTIVE: "active",
  PENDING: "pending",
  DISABLED: "disabled",
} as const;

export type RanchRole = (typeof RANCH_ROLES)[keyof typeof RANCH_ROLES];