import { Router } from "express";
import * as ctrl from "../controllers/integrationController.js";

const router = Router();

router.get("/", ctrl.list);     // connection status per business+provider (no secrets)
router.get("/google/accounts", ctrl.googleAccounts); // client accounts under the manager (?business_id=)
router.put("/", ctrl.save);     // save manual credentials (encrypted at rest)

export default router;
