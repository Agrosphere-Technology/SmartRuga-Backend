import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { acceptInvite } from "../controllers/invite.controller";

const router = Router();

// Accept invite (token from email/link)
router.post("/accept", requireAuth(), acceptInvite);

export default router;
