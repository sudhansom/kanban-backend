import express from "express";
import { updateColumn } from "../controllers/column-controller.js";
import { isAuthenticated } from "../middleware/check-auth.js";

/**
 * Routes mounted at `/api/columns`.
 *
 * - PUT /:columnId → update column name and/or position (JWT required)
 */
const router = express.Router();

router.put("/:columnId", isAuthenticated, updateColumn);

export default router;
