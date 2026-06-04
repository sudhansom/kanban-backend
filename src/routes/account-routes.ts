import express from "express";
import { loginAccount } from "../controllers/account-controller.js";

const router = express.Router();

router.post("/", loginAccount);

export default router;
