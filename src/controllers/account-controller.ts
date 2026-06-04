import {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";

import { Account } from "../models/account.js";
import HttpError from "../http-error/http-error.js";
import { loadDataFile } from "../utils/load-data.js";

const JWT_SECRET = process.env.JWT_SECRET || "do-not-share";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const loginAccount = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { username, password } = req.body;

  if (!username || !password) {
    const error = new HttpError("Invalid username or password", 401);
    return next(error);
  }

  let existingAccount;
  try {
    existingAccount = await Account.findOne({
      username: String(username).toLowerCase().trim(),
    });
  } catch (err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }

  if (!existingAccount) {
    const error = new HttpError("Invalid username or password", 401);
    return next(error);
  }

  let isValidPassword;
  try {
    isValidPassword = await bcrypt.compare(
      password,
      existingAccount.passwordHash,
    );
  } catch (err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError("Invalid username or password", 401);
    return next(error);
  }

  let token;
  try {
    const signOptions: SignOptions = {
      expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
    };
    token = jwt.sign(
      { userId: existingAccount.userId, username: existingAccount.username },
      JWT_SECRET,
      signOptions,
    );
  } catch (err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }

  res.status(200).json({
    success: true,
    data: {
      userId: existingAccount.userId,
      token,
    },
  });
};

export const getAllAccounts = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accounts } = loadDataFile();
    res.status(200).json(accounts);
  } catch (err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }
};
