import { RanchRole } from "../constants/roles";
import type { PlatformRole, MembershipStatus } from "./index";

export interface UserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  platformRole: PlatformRole;
}

export interface RanchDTO {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
}

export interface RanchMemberDTO {
  id: string;
  ranchId: string;
  userId: string;
  role: RanchRole;
  status: MembershipStatus;
}
