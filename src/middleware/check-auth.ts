import { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import HttpError from "../http-error/http-error.js";

const JWT_SECRET = process.env.JWT_SECRET || "do-not-share";

/**
 * Express request after JWT middleware runs.
 * `userId` is set when the Bearer token is valid.
 */
export type AuthenticatedRequest = Request & {
  userId?: string;
};

/**
 * Protects routes that require a logged-in user.
 *
 * Expects header: `Authorization: Bearer <token>`
 * Token must be issued by POST /api/accounts and signed with JWT_SECRET.
 *
 * On success, sets `req.userId` and calls `next()`.
 * On failure, passes HttpError 401 to the error handler.
 */
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
