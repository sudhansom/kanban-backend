import express from "express";
import { getAllBoards } from "../controllers/board-controller.js";
import { isAuthenticated } from "../middleware/check-auth.js";

/**
 * Routes mounted at `/api/boards`.
 *
 * - GET / → all boards (JWT required)
 */
const router = express.Router();

router.get("/", isAuthenticated, getAllBoards);

export default router;
