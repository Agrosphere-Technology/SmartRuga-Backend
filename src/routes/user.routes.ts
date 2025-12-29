import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { getMyProfile } from "../controllers/user.controller";

const router = Router();
router.get("/me", requireAuth(), getMyProfile);
export default router;
