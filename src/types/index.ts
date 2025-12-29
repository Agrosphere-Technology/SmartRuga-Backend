import {
  PLATFORM_ROLES,
  RANCH_ROLES,
  MEMBERSHIP_STATUS,
} from "../constants/roles";

export interface AuthUser {
  id: string; // UUID
  email: string;
  platformRole: (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];
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
  ranchRole: (typeof RANCH_ROLES)[keyof typeof RANCH_ROLES];
  status: (typeof MEMBERSHIP_STATUS)[keyof typeof MEMBERSHIP_STATUS];
}
