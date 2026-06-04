import {
  type NextFunction,
  type Response,
} from "express";
import { Board } from "../models/board.js";
import { type IBoard, type IColumn } from "../models/board-types.js";
import HttpError from "../http-error/http-error.js";
import { type AuthenticatedRequest } from "../middleware/check-auth.js";

/**
 * Converts a MongoDB board document to the JSON shape the frontend expects.
 * Database uses camelCase (`boardId`); API uses `id` and snake_case (`board_id`, `column_id`).
 */
const mapBoardToApi = (board: IBoard) => ({
  id: board.boardId,
  name: board.name,
  columns: (board.columns ?? []).map((col: IColumn) => ({
    id: col.columnId,
    name: col.name,
    position: col.position,
    board_id: col.boardId,
    tasks: (col.tasks ?? []).map((task) => ({
      id: task.taskId,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      column_id: task.columnId,
      position: task.position,
    })),
  })),
});

/**
 * GET /api/boards — return every board with columns and tasks.
 *
 * Requires `Authorization: Bearer <token>` (see isAuthenticated middleware).
 */
export const getAllBoards = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  let boards;
  try {
    boards = await Board.find().sort({ boardId: 1 }).lean();
  } catch (err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }

  const apiBoards = boards.map((board) => mapBoardToApi(board as IBoard));

  res.status(200).json({
    success: true,
    data: { boards: apiBoards },
  });
};
