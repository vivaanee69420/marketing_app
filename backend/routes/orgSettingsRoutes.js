import { Router } from "express";
import * as ctrl from "../controllers/orgSettingsController.js";

// Org-level (BYO) provider app/project credentials.
const router = Router();

router.get("/:provider", ctrl.get);   // safe view (no secrets)
router.put("/:provider", ctrl.save);  // save/merge (secrets encrypted)

export default router;
