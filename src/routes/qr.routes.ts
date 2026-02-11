import { Router } from "express";
import { qrScanAnimal } from "../controllers/qr.controller";

const router = Router();

// Public QR entry point (no auth for now; can be upgraded later)
router.get("/a/:publicId", qrScanAnimal);

export default router;
