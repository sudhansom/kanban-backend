import { type NextFunction, type Response } from "express";
import { Account } from "../models/account.js";
import { Board } from "../models/board.js";
import { Column } from "../models/column.js";
import { Task } from "../models/task.js";
import HttpError from "../http-error/http-error.js";
import { type AuthenticatedRequest } from "../middleware/check-auth.js";
import { type IBoard } from "../models/board-types.js";
import { type IColumn } from "../models/column-types.js";
import { type ITask } from "../models/task-types.js";
import { type IAccount } from "../models/account-types.js";

/**
 * GET /api/boards — returns nested boards with columns and tasks.
 *
 * Data is normalized in MongoDB (separate collections), but this endpoint
 * reconstructs the nested shape expected by the frontend.
 */
export const getAllBoards = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const [boards, columns, tasks, accounts] = await Promise.all([
      Board.find().sort({ boardId: 1 }).lean(),
      Column.find().sort({ boardId: 1, position: 1 }).lean(),
      Task.find().sort({ columnId: 1, position: 1 }).lean(),
      Account.find().select("username -_id").lean(),
    ]);

    const usernameLookup = new Set(
      (accounts as IAccount[]).map((account) => account.username.toLowerCase()),
    );

    const tasksByColumnId = new Map<number, ITask[]>();
    for (const task of tasks as ITask[]) {
      if (!tasksByColumnId.has(task.columnId)) {
        tasksByColumnId.set(task.columnId, []);
      }
      tasksByColumnId.get(task.columnId)?.push(task);
    }

    const columnsByBoardId = new Map<number, IColumn[]>();
    for (const column of columns as IColumn[]) {
      if (!columnsByBoardId.has(column.boardId)) {
        columnsByBoardId.set(column.boardId, []);
      }
      columnsByBoardId.get(column.boardId)?.push(column);
    }

    const apiBoards = (boards as IBoard[]).map((board) => ({
      id: board.boardId,
      name: board.name,
      columns: (columnsByBoardId.get(board.boardId) ?? []).map((column) => ({
        id: column.columnId,
        name: column.name,
        position: column.position,
        board_id: column.boardId,
        tasks: (tasksByColumnId.get(column.columnId) ?? []).map((task) => ({
          id: task.taskId,
          title: task.title,
          description: task.description,
          assignee: usernameLookup.has(task.assignee.toLowerCase())
            ? task.assignee
            : "",
          column_id: task.columnId,
          position: task.position,
        })),
      })),
    }));

    res.status(200).json({
      success: true,
      data: { boards: apiBoards },
    });
  } catch (_err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }
};
