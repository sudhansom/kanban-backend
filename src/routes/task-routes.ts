import express from "express";
import { createTask, deleteTask, updateTask } from "../controllers/task-controller.js";
import { isAuthenticated } from "../middleware/check-auth.js";

/**
 * Routes mounted at `/api/tasks`.
 *
 * - POST / → create task (JWT required)
 * - DELETE /:taskId → remove task (JWT required)
 * - PUT /:taskId → update task fields and/or position (JWT required)
 */
const router = express.Router();

router.post("/", isAuthenticated, createTask);
router.delete("/:taskId", isAuthenticated, deleteTask);
router.put("/:taskId", isAuthenticated, updateTask);

export default router;
