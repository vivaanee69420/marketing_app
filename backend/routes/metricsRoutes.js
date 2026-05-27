import { Router } from "express";
import * as ctrl from "../controllers/metricsController.js";

const router = Router();

router.get("/summary", ctrl.summary);        // totals + by-provider (optional ?business_id)
router.get("/by-business", ctrl.byBusiness);  // per-business spend/clicks/conversions (+ provider split)
router.get("/campaigns", ctrl.campaigns);     // per-campaign rollup (business, provider, spend/clicks/conv)
router.get("/trend", ctrl.trend);             // last 6 months spend/conversions
router.get("/hero", ctrl.hero);               // highest-ROI business + headline stats
router.get("/job-health", ctrl.jobHealth);    // sync_runs + scheduled_jobs health

export default router;
