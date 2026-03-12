import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import { getAnimalSummary, getAnimalTimeline } from "../controllers/animalTimeline.controller";

const router = Router({ mergeParams: true });

router.get(
    "/:slug/animals/:animalId/timeline",
    requireAuth(),
    requireRanchAccess("slug"),
    getAnimalTimeline
);

router.get(
    "/:slug/animals/:animalId/summary",
    requireAuth(),
    requireRanchAccess("slug"),
    getAnimalSummary
);


export default router;
