import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { updateUserPlatformRole } from "../controllers/admin.controller";

const router = Router();

// Only platform admins can do role management
router.patch(
  "/users/:id/platform-role",
  requireAuth(["admin", "super_admin"]),
  updateUserPlatformRole
);

export default router;
