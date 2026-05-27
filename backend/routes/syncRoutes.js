import { Router } from "express";
import * as ctrl from "../controllers/syncController.js";

const router = Router();

router.post("/", ctrl.run); // { business_id, provider? } — runs on-demand sync

export default router;
