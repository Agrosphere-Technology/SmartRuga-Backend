import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requireRanchAccess } from "../middlewares/ranchAccess";
import {
  createAnimal,
  getAnimalById,
  listAnimals,
} from "../controllers/animal.controller";

const router = Router({ mergeParams: true });

router.post(
  "/:slug/animals",
  requireAuth(),
  requireRanchAccess("slug"),
  createAnimal,
);

router.get(
  "/:slug/animals",
  requireAuth(),
  requireRanchAccess("slug"),
  listAnimals,
);

router.get(
  "/:slug/animals/:id",
  requireAuth(),
  requireRanchAccess("slug"),
  getAnimalById,
);

export default router;
