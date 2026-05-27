import { Router } from "express";
import * as ctrl from "../controllers/adminController.js";

// Mounted under requireAuth + requireSuperadmin in index.js.
const router = Router();

router.get("/users", ctrl.listUsers);             // all users, pending first
router.post("/users/:id/approve", ctrl.approve);  // set status = approved
router.post("/users/:id/reject", ctrl.reject);    // set status = rejected

export default router;
