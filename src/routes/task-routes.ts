import express from "express";
import { updateTask } from "../controllers/task-controller.js";
import { isAuthenticated } from "../middleware/check-auth.js";

/**
 * Routes mounted at `/api/tasks`.
 *
 * - PUT /:taskId → update task fields and/or position (JWT required)
 */
const router = express.Router();

router.put("/:taskId", isAuthenticated, updateTask);

export default router;
