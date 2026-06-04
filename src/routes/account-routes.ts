import express from "express";
import {
  getAllAccounts,
  loginAccount,
} from "../controllers/account-controller.js";

const router = express.Router();

router.get("/", getAllAccounts);
router.post("/", loginAccount);

export default router;
