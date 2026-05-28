import { Router } from "express";
import * as ctrl from "../controllers/syncController.js";

const router = Router();

router.post("/", ctrl.run);             // { business_id, provider? } — JSON response
router.post("/stream", ctrl.runStream); // same payload, SSE progress stream

export default router;
