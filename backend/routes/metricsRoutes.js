import { Router } from "express";
import * as ctrl from "../controllers/metricsController.js";

const router = Router();

router.get("/summary", ctrl.summary);        // totals + by-provider (optional ?business_id)
router.get("/by-business", ctrl.byBusiness);  // per-business spend/clicks/conversions
router.get("/trend", ctrl.trend);             // last 6 months spend/conversions

export default router;
