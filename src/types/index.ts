import {
  PLATFORM_ROLES,
  RANCH_ROLES,
  MEMBERSHIP_STATUS,
} from "../constants/roles";

export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

export type RanchRole = (typeof RANCH_ROLES)[keyof typeof RANCH_ROLES];

export type MembershipStatus =
  (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];

// Represents the authenticated user making the request
export interface AuthUser {
  id: string; // UUID
  email: string;
  platformRole: PlatformRole;
  firstName?: string | null;
  lastName?: string | null;
}

// Represents the context of a ranch the user is associated with
export interface RanchContext {
  id: string; // UUID
  slug: string;
  name: string;
}

// Represents the context of a ranch membership for the user
export interface RanchMembershipContext {
  id: string; // UUID
  ranchRole: RanchRole;
  status: MembershipStatus;
}
