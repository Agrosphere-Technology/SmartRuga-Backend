import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
  createInvite,
  listInvites,
  resendInvite,
  revokeInvite,
} from "../controllers/invite.controller";

// Merge params to access :slug from parent routes
const router = Router({ mergeParams: true });

// Create a new invite for a ranch
router.post(
  "/:slug/invites",
  requireAuth(),
  requireRanchAccess("slug"),
  createInvite
);

// List invites for a ranch
router.get(
  "/:slug/invites",
  requireAuth(),
  requireRanchAccess("slug"),
  listInvites
);

// Revoke an invite
router.delete(
  "/:slug/invites/:inviteId",
  requireAuth(),
  requireRanchAccess("slug"),
  revokeInvite
);

// Resend an invite
router.post(
  "/:slug/invites/:inviteId/resend",
  requireAuth(),
  requireRanchAccess("slug"),
  resendInvite
);

export default router;
