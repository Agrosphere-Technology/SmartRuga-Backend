export type PlatformRole = "user" | "admin" | "super_admin";
export type RanchRole = "owner" | "manager" | "vet" | "storekeeper" | "worker";
export type MembershipStatus = "active" | "pending" | "disabled";

export interface AuthUser {
  id: string; // UUID
  email: string;
  platformRole: PlatformRole;
  firstName?: string | null;
  lastName?: string | null;
}

export interface RanchContext {
  id: string; // UUID
  slug: string;
  name: string;
}

export interface RanchMembershipContext {
  id: string; // UUID
  ranchRole: RanchRole;
  status: MembershipStatus;
}
