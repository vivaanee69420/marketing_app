import { Router } from "express";
import * as ctrl from "../controllers/businessController.js";

// Auth deferred: org resolved from APP_ORG_ID via withOrg. Add requireAuth +
// per-user org resolution when auth lands.
const router = Router();

router.get("/", ctrl.list);
router.get("/:id", ctrl.getOne);

export default router;
