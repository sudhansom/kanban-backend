import { type NextFunction, type Response } from "express";
import { Account } from "../models/account.js";
import { Column } from "../models/column.js";
import { Task } from "../models/task.js";
import HttpError from "../http-error/http-error.js";
import { type AuthenticatedRequest } from "../middleware/check-auth.js";

type TaskUpdateBody = {
  id?: number;
  title?: string;
  description?: string;
  assignee?: string;
  column_id?: number;
  position?: number;
};

const parseTaskUpdateBody = (body: unknown): TaskUpdateBody => {
  if (typeof body === "string") {
    try {
      return parseTaskUpdateBody(JSON.parse(body));
    } catch {
      throw new HttpError(
        'Invalid JSON body. Send a task object with Content-Type: application/json.',
        400,
      );
    }
  }

  if (body === null || typeof body !== "object") {
    throw new HttpError(
      'Invalid JSON body. Send a task object with Content-Type: application/json.',
      400,
    );
  }

  return body as TaskUpdateBody;
};

const reorderTasksInColumn = async (
  columnId: number,
  taskId: number,
  oldPosition: number,
  newPosition: number,
) => {
  if (oldPosition < newPosition) {
    await Task.updateMany(
      {
        columnId,
        taskId: { $ne: taskId },
        position: { $gt: oldPosition, $lte: newPosition },
      },
      { $inc: { position: -1 } },
    );
    return;
  }

  if (oldPosition > newPosition) {
    await Task.updateMany(
      {
        columnId,
        taskId: { $ne: taskId },
        position: { $gte: newPosition, $lt: oldPosition },
      },
      { $inc: { position: 1 } },
    );
  }
};

const moveTaskToColumn = async (
  oldColumnId: number,
  oldPosition: number,
  newColumnId: number,
  newPosition: number,
) => {
  await Task.updateMany(
    { columnId: oldColumnId, position: { $gt: oldPosition } },
    { $inc: { position: -1 } },
  );

  await Task.updateMany(
    { columnId: newColumnId, position: { $gte: newPosition } },
    { $inc: { position: 1 } },
  );
};

const toApiTask = (
  task: {
    taskId: number;
    title: string;
    description: string;
    assignee: string;
    columnId: number;
    position: number;
  },
  validAssignees: Set<string>,
) => ({
  id: task.taskId,
  title: task.title,
  description: task.description,
  assignee: validAssignees.has(task.assignee.toLowerCase()) ? task.assignee : "",
  column_id: task.columnId,
  position: task.position,
});

/**
 * PUT /api/tasks/:taskId — update an existing task (never creates a new one).
 *
 * The task id in the URL is the source of truth. Body `id` must match when sent.
 * Body: `{ title?, description?, assignee?, column_id?, position? }`
 */
export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const taskId = Number(req.params.taskId);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    const error = new HttpError("Invalid task id.", 400);
    return next(error);
  }

  let body: TaskUpdateBody;
  try {
    body = parseTaskUpdateBody(req.body);
  } catch (error) {
    return next(error);
  }

  const { id, title, description, assignee, column_id, position } = body;

  if (id === 0) {
    const error = new HttpError(
      "Cannot create a task with PUT. Use POST /api/tasks instead.",
      400,
    );
    return next(error);
  }

  if (id !== undefined && id !== taskId) {
    const error = new HttpError(
      "Body id must match the task id in the URL.",
      400,
    );
    return next(error);
  }

  if (
    title === undefined &&
    description === undefined &&
    assignee === undefined &&
    column_id === undefined &&
    position === undefined
  ) {
    const error = new HttpError("At least one field is required to update.", 400);
    return next(error);
  }

  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
    const error = new HttpError("Title must be a non-empty string.", 400);
    return next(error);
  }

  if (description !== undefined && typeof description !== "string") {
    const error = new HttpError("Description must be a string.", 400);
    return next(error);
  }

  if (assignee !== undefined && typeof assignee !== "string") {
    const error = new HttpError("Assignee must be a string.", 400);
    return next(error);
  }

  if (
    column_id !== undefined &&
    (!Number.isInteger(column_id) || column_id <= 0)
  ) {
    const error = new HttpError("column_id must be a positive integer.", 400);
    return next(error);
  }

  if (
    position !== undefined &&
    (!Number.isInteger(position) || position < 0)
  ) {
    const error = new HttpError("Position must be a non-negative integer.", 400);
    return next(error);
  }

  try {
    const existingTask = await Task.findOne({ taskId }).lean();

    if (!existingTask) {
      const error = new HttpError("Task not found.", 404);
      return next(error);
    }

    const newColumnId = column_id ?? existingTask.columnId;
    const columnChanged = newColumnId !== existingTask.columnId;

    if (columnChanged) {
      const column = await Column.findOne({ columnId: newColumnId }).lean();
      if (!column) {
        const error = new HttpError("Column not found.", 404);
        return next(error);
      }
    }

    // When only column_id is sent, append to the end of the target column.
    const targetTaskCount = columnChanged
      ? await Task.countDocuments({ columnId: newColumnId })
      : 0;
    const newPosition =
      position ??
      (columnChanged ? targetTaskCount : existingTask.position);
    const positionChanged =
      newPosition !== existingTask.position || columnChanged;

    if (columnChanged) {
      const maxPosition = targetTaskCount;

      if (newPosition > maxPosition) {
        const error = new HttpError(
          `Position must be between 0 and ${maxPosition}.`,
          400,
        );
        return next(error);
      }

      await moveTaskToColumn(
        existingTask.columnId,
        existingTask.position,
        newColumnId,
        newPosition,
      );
    } else if (position !== undefined && newPosition !== existingTask.position) {
      const taskCount = await Task.countDocuments({ columnId: existingTask.columnId });
      const maxPosition = taskCount - 1;

      if (newPosition > maxPosition) {
        const error = new HttpError(
          `Position must be between 0 and ${maxPosition}.`,
          400,
        );
        return next(error);
      }

      await reorderTasksInColumn(
        existingTask.columnId,
        taskId,
        existingTask.position,
        newPosition,
      );
    }

    const updates: {
      title?: string;
      description?: string;
      assignee?: string;
      columnId?: number;
      position?: number;
    } = {};

    if (title !== undefined) {
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (assignee !== undefined) {
      updates.assignee = assignee.trim();
    }
    if (columnChanged) {
      updates.columnId = newColumnId;
    }
    if (positionChanged || columnChanged) {
      updates.position = newPosition;
    }

    const updatedTask = await Task.findOneAndUpdate(
      { taskId },
      { $set: updates },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedTask) {
      const error = new HttpError("Task not found.", 404);
      return next(error);
    }

    const accounts = await Account.find().select("username -_id").lean();
    const validAssignees = new Set(
      accounts.map((account) => account.username.toLowerCase()),
    );

    // Flat task object — matches the Python API and Angular frontend expectation.
    res.status(200).json(toApiTask(updatedTask, validAssignees));
  } catch (_err) {
    const error = new HttpError("An unknown error occurred.", 500);
    return next(error);
  }
};
