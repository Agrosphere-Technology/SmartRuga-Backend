import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  createRanch,
  getRanchBySlug,
  listAllRanches,
} from "../controllers/ranch.controller";
import { PLATFORM_ROLES } from "../constants/roles";

const router = Router();

// create ranch
router.post(
  "/",
  requireAuth([PLATFORM_ROLES.ADMIN, PLATFORM_ROLES.SUPER_ADMIN]),
  createRanch
);

// list ranches user belongs to
router.get("/", requireAuth(), listAllRanches);

// get ranch by slug
router.get("/:slug", requireAuth(), getRanchBySlug);

export default router;
