import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { createInvite, listInvites } from "../controllers/invite.controller";

const router = Router({ mergeParams: true });

router.post(
  "/:slug/invites",
  requireAuth(),
  requireRanchAccess("slug"),
  createInvite
);
router.get(
  "/:slug/invites",
  requireAuth(),
  requireRanchAccess("slug"),
  listInvites
);

export default router;
