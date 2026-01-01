import { z } from "zod";
import { RANCH_ROLES } from "../constants/roles";

export const createInviteSchema = z.object({
  email: z.email(),
  ranchRole: z.enum([
    RANCH_ROLES.OWNER,
    RANCH_ROLES.MANAGER,
    RANCH_ROLES.VET,
    RANCH_ROLES.STOREKEEPER,
    RANCH_ROLES.WORKER,
  ]),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(20),
});
