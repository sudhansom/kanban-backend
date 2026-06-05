import express from "express";
import { deleteTask, updateTask } from "../controllers/task-controller.js";
import { isAuthenticated } from "../middleware/check-auth.js";

/**
 * Routes mounted at `/api/tasks`.
 *
 * - DELETE /:taskId → remove task (JWT required)
 * - PUT /:taskId → update task fields and/or position (JWT required)
 */
const router = express.Router();

router.delete("/:taskId", isAuthenticated, deleteTask);
router.put("/:taskId", isAuthenticated, updateTask);

export default router;
