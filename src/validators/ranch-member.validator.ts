import { z } from "zod";

export const updateRanchMemberRoleSchema = z.object({
    ranchRole: z.enum(["manager", "worker", "vet", "storekeeper"]),
});