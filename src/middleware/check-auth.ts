import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import HttpError from "../http-error/http-error.js";

const JWT_SECRET = process.env.JWT_SECRET || "do-not-share";

export type AuthenticatedRequest = Request & {
  userId?: string;
};

export const isAuthenticated = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    const error = new HttpError("Invalid or missing token", 401);
    return next(error);
  }

  try {
    const decodedToken = jwt.verify(token, JWT_SECRET);
    if (
      typeof decodedToken === "object" &&
      decodedToken !== null &&
      "userId" in decodedToken
    ) {
      req.userId = (decodedToken as { userId: string }).userId;
      return next();
    }
    const error = new HttpError("Invalid or missing token", 401);
    return next(error);
  } catch (err) {
    const error = new HttpError("Invalid or missing token", 401);
    return next(error);
  }
};
