import { type NextFunction, type Response } from "express";
import { Column } from "../models/column.js";
import HttpError from "../http-error/http-error.js";
import { type AuthenticatedRequest } from "../middleware/check-auth.js";

type ColumnUpdateBody = {
  name?: string;
  position?: number;
};

const parseColumnUpdateBody = (body: unknown): ColumnUpdateBody => {
  if (typeof body === "string") {
    try {
      return parseColumnUpdateBody(JSON.parse(body));
    } catch {
      throw new HttpError(
        'Invalid JSON body. Send { "name": "To Do", "position": 1 } with Content-Type: application/json.',
        400,
      );
    }
  }

  if (body === null || typeof body !== "object") {
    throw new HttpError(
      'Invalid JSON body. Send { "name": "To Do", "position": 1 } with Content-Type: application/json.',
      400,
    );
  }

  return body as ColumnUpdateBody;
};

const parseOptionalInt = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return undefined;
  }

  return parsed;
};

const clampPosition = (position: number, maxPosition: number) =>
  Math.min(Math.max(0, position), maxPosition);

/**
 * Shifts sibling columns on the same board when one column moves position.
 * Positions stay unique and contiguous (0 … n-1).
 */
const reorderBoardColumns = async (
  boardId: number,
  columnId: number,
  oldPosition: number,
  newPosition: number,
) => {
  if (oldPosition < newPosition) {
    await Column.updateMany(
      {
        boardId,
        columnId: { $ne: columnId },
        position: { $gt: oldPosition, $lte: newPosition },
      },
      { $inc: { position: -1 } },
    );
    return;
  }

  if (oldPosition > newPosition) {
    await Column.updateMany(
      {
        boardId,
        columnId: { $ne: columnId },
        position: { $gte: newPosition, $lt: oldPosition },
      },
      { $inc: { position: 1 } },
    );
  }
};

/**
 * PUT /api/columns/:columnId — update a column's name and/or position.
 *
 * Body: `{ name?: string, position?: number }`
 * When position changes, other columns on the same board shift so positions
 * remain unique (e.g. move 1→2 swaps with 2; move 4→0 shifts 0–3 up by one).
 */
export const updateColumn = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const columnId = Number(req.params.columnId);

  if (!Number.isInteger(columnId) || columnId <= 0) {
    const error = new HttpError("Invalid column id.", 400);
    return next(error);
  }

  let body: ColumnUpdateBody;
  try {
    body = parseColumnUpdateBody(req.body);
  } catch (error) {
    return next(error);
  }

  const { name, position } = body;
  const parsedPosition = parseOptionalInt(position);

  if (name === undefined && parsedPosition === undefined) {
    const error = new HttpError("At least one of name or position is required.", 400);
    return next(error);
  }

  if (name !== undefined && typeof name !== "string") {
    const error = new HttpError("Name must be a string.", 400);
    return next(error);
  }

  if (position !== undefined && position !== null && parsedPosition === undefined) {
    const error = new HttpError("Position must be a non-negative integer.", 400);
    return next(error);
  }

  if (parsedPosition !== undefined && parsedPosition < 0) {
    const error = new HttpError("Position must be a non-negative integer.", 400);
    return next(error);
  }

  try {
    const column = await Column.findOne({ columnId });

    if (!column) {
      const error = new HttpError("Column not found.", 404);
      return next(error);
    }

    const columnCount = await Column.countDocuments({ boardId: column.boardId });
    const maxPosition = columnCount - 1;

    if (name !== undefined && name.trim() !== "") {
      column.name = name.trim();
    }

    const oldPosition = column.position;
    const newPosition =
      parsedPosition !== undefined
        ? clampPosition(parsedPosition, maxPosition)
        : oldPosition;

    if (newPosition !== oldPosition) {
      await reorderBoardColumns(
        column.boardId,
        column.columnId,
        oldPosition,
        newPosition,
      );
      column.position = newPosition;
    }

    await column.save();

    res.status(200).json({
      success: true,
      data: {
        column: {
          id: column.columnId,
          name: column.name,
          position: column.position,
          board_id: column.boardId,
        },
      },
    });
  } catch (_err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }
};
