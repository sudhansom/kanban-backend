import express from "express";
import {
  getAllAccounts,
  loginAccount,
} from "../controllers/account-controller.js";

/**
 * Routes mounted at `/api/accounts`.
 *
 * - GET  /  → list accounts (public)
 * - POST /  → login and receive JWT (public)
 */
const router = express.Router();

router.get("/", getAllAccounts);
router.post("/", loginAccount);

export default router;
