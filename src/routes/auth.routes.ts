import { Router } from "express";
import {
  login,
  logout,
  refresh,
  register,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// handy endpoint for frontend/mobile
router.get("/me", requireAuth(), (req, res) => {
  res.json({ user: req.user });
});

export default router;
