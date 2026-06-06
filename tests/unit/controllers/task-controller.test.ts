import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Response } from "express";

import {
  createTask,
  deleteTask,
  updateTask,
} from "../../../src/controllers/task-controller.js";
import HttpError from "../../../src/http-error/http-error.js";
import type { AuthenticatedRequest } from "../../../src/middleware/check-auth.js";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from "../../helpers/mock-express.js";

vi.mock("../../../src/models/task.js", () => ({
  Task: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock("../../../src/models/column.js", () => ({
  Column: { findOne: vi.fn() },
}));

vi.mock("../../../src/models/account.js", () => ({
  Account: { find: vi.fn() },
}));

import { Task } from "../../../src/models/task.js";
import { Column } from "../../../src/models/column.js";
import { Account } from "../../../src/models/account.js";

const existingTask = {
  taskId: 1,
  title: "Welcome Task",
  description: "Drag me",
  assignee: "demo",
  columnId: 1,
  position: 0,
};

const setupNextTaskId = (lastTaskId: number | null) => {
  const lean = vi
    .fn()
    .mockResolvedValue(lastTaskId !== null ? { taskId: lastTaskId } : null);
  const select = vi.fn().mockReturnValue({ lean });
  const sort = vi.fn().mockReturnValue({ select });
  vi.mocked(Task.findOne).mockReturnValue({ sort } as never);
  return { sort, select, lean };
};

const setupColumnFindOne = (column: unknown) => {
  const lean = vi.fn().mockResolvedValue(column);
  vi.mocked(Column.findOne).mockReturnValue({ lean } as never);
  return lean;
};

const setupAccountFind = (usernames: string[] = ["demo"]) => {
  const lean = vi.fn().mockResolvedValue(
    usernames.map((username) => ({ username })),
  );
  vi.mocked(Account.find).mockReturnValue({
    select: vi.fn().mockReturnValue({ lean }),
  } as never);
};

const setupTaskFindOne = (task: unknown) => {
  const lean = vi.fn().mockResolvedValue(task);
  vi.mocked(Task.findOne).mockReturnValue({ lean } as never);
  return lean;
};

const setupFindOneAndUpdate = (task: Record<string, unknown>) => {
  const lean = vi.fn().mockResolvedValue(task);
  vi.mocked(Task.findOneAndUpdate).mockReturnValue({ lean } as never);
  return lean;
};

describe("task-controller", () => {
  let req: AuthenticatedRequest;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockRequest({ userId: "1" }) as AuthenticatedRequest;
    req.params = { taskId: "1" };
    res = createMockResponse();
    next = createMockNext();
    vi.mocked(Task.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);
    setupAccountFind();
  });

  describe("createTask", () => {
    it("returns 400 when title is missing", async () => {
      req.body = { column_id: 1 };

      await createTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Title must be a non-empty string.",
        code: 400,
      });
    });

    it("returns 400 when column_id is invalid", async () => {
      req.body = { title: "New Task", column_id: 0 };

      await createTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "column_id must be a positive integer.",
        code: 400,
      });
    });

    it("returns 404 when column does not exist", async () => {
      req.body = { title: "New Task", column_id: 1 };
      setupColumnFindOne(null);

      await createTask(req, res, next);

      expect(Column.findOne).toHaveBeenCalledWith({ columnId: 1 });
      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Column not found.",
        code: 404,
      });
    });

    it("creates a task and returns 201", async () => {
      req.body = {
        title: "New Task",
        description: "Details",
        assignee: "demo",
        column_id: 1,
      };
      setupColumnFindOne({ columnId: 1, boardId: 1 });
      vi.mocked(Task.countDocuments).mockResolvedValue(2);
      setupNextTaskId(5);
      const createdDoc = {
        taskId: 6,
        title: "New Task",
        description: "Details",
        assignee: "demo",
        columnId: 1,
        position: 2,
        toObject: vi.fn().mockReturnValue({
          taskId: 6,
          title: "New Task",
          description: "Details",
          assignee: "demo",
          columnId: 1,
          position: 2,
        }),
      };
      vi.mocked(Task.create).mockResolvedValue(createdDoc as never);

      await createTask(req, res, next);

      expect(Task.updateMany).toHaveBeenCalledWith(
        { columnId: 1, position: { $gte: 2 } },
        { $inc: { position: 1 } },
      );
      expect(Task.create).toHaveBeenCalledWith({
        taskId: 6,
        title: "New Task",
        description: "Details",
        assignee: "demo",
        columnId: 1,
        position: 2,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        id: 6,
        title: "New Task",
        description: "Details",
        assignee: "demo",
        column_id: 1,
        position: 2,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("clears assignee when username is not in accounts", async () => {
      req.body = {
        title: "New Task",
        assignee: "unknown-user",
        column_id: 1,
      };
      setupColumnFindOne({ columnId: 1, boardId: 1 });
      vi.mocked(Task.countDocuments).mockResolvedValue(0);
      setupNextTaskId(null);
      const createdDoc = {
        taskId: 1,
        title: "New Task",
        description: "",
        assignee: "unknown-user",
        columnId: 1,
        position: 0,
        toObject: vi.fn().mockReturnValue({
          taskId: 1,
          title: "New Task",
          description: "",
          assignee: "unknown-user",
          columnId: 1,
          position: 0,
        }),
      };
      vi.mocked(Task.create).mockResolvedValue(createdDoc as never);
      setupAccountFind([]);

      await createTask(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ assignee: "" }),
      );
    });
  });

  describe("deleteTask", () => {
    it("returns 400 for invalid task id", async () => {
      req.params = { taskId: "abc" };

      await deleteTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Invalid task id.",
        code: 400,
      });
    });

    it("returns 404 when task is not found", async () => {
      setupTaskFindOne(null);

      await deleteTask(req, res, next);

      expect(Task.findOne).toHaveBeenCalledWith({ taskId: 1 });
      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Task not found.",
        code: 404,
      });
    });

    it("deletes task and returns the removed task", async () => {
      setupTaskFindOne(existingTask);
      vi.mocked(Task.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

      await deleteTask(req, res, next);

      expect(Task.deleteOne).toHaveBeenCalledWith({ taskId: 1 });
      expect(Task.updateMany).toHaveBeenCalledWith(
        { columnId: 1, position: { $gt: 0 } },
        { $inc: { position: -1 } },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: "Welcome Task",
        description: "Drag me",
        assignee: "demo",
        column_id: 1,
        position: 0,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns 500 when database lookup fails", async () => {
      vi.mocked(Task.findOne).mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("db down")),
      } as never);

      await deleteTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        code: 500,
      });
    });
  });

  describe("updateTask", () => {
    it("returns 400 for invalid task id", async () => {
      req.params = { taskId: "abc" };

      await updateTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Invalid task id.",
        code: 400,
      });
    });

    it("returns 400 when body id is 0", async () => {
      req.body = { id: 0, title: "New Task" };

      await updateTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Cannot create a task with PUT. Use POST /api/tasks instead.",
        code: 400,
      });
    });

    it("returns 400 when body id does not match URL id", async () => {
      req.body = { id: 2, title: "Updated" };

      await updateTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Body id must match the task id in the URL.",
        code: 400,
      });
    });

    it("returns 404 when task is not found", async () => {
      req.body = { title: "Updated" };
      setupTaskFindOne(null);

      await updateTask(req, res, next);

      expect(Task.findOne).toHaveBeenCalledWith({ taskId: 1 });
      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Task not found.",
        code: 404,
      });
    });

    it("updates title and returns flat task object", async () => {
      req.body = { title: "Updated Task" };
      setupTaskFindOne(existingTask);
      setupFindOneAndUpdate({
        ...existingTask,
        title: "Updated Task",
      });

      await updateTask(req, res, next);

      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        { taskId: 1 },
        { $set: { title: "Updated Task" } },
        { new: true, runValidators: true },
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        id: 1,
        title: "Updated Task",
        description: "Drag me",
        assignee: "demo",
        column_id: 1,
        position: 0,
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("moves task to a new column when only column_id is sent", async () => {
      req.body = { column_id: 2 };
      setupTaskFindOne(existingTask);
      setupColumnFindOne({ columnId: 2, boardId: 1 });
      vi.mocked(Task.countDocuments).mockResolvedValue(1);
      setupFindOneAndUpdate({
        ...existingTask,
        columnId: 2,
        position: 1,
      });

      await updateTask(req, res, next);

      expect(Task.updateMany).toHaveBeenCalledTimes(2);
      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        { taskId: 1 },
        { $set: { columnId: 2, position: 1 } },
        { new: true, runValidators: true },
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          column_id: 2,
          position: 1,
        }),
      );
    });

    it("clamps sentinel position 1111 when moving to another column", async () => {
      req.body = {
        id: 1,
        title: "Welcome Task",
        description: "Drag me",
        assignee: "demo",
        column_id: 2,
        position: 1111,
      };
      setupTaskFindOne(existingTask);
      setupColumnFindOne({ columnId: 2, boardId: 1 });
      vi.mocked(Task.countDocuments).mockResolvedValue(2);
      setupFindOneAndUpdate({
        ...existingTask,
        columnId: 2,
        position: 2,
      });

      await updateTask(req, res, next);

      expect(Task.findOneAndUpdate).toHaveBeenCalledWith(
        { taskId: 1 },
        {
          $set: {
            title: "Welcome Task",
            description: "Drag me",
            assignee: "demo",
            columnId: 2,
            position: 2,
          },
        },
        { new: true, runValidators: true },
      );
    });

    it("returns 404 when target column does not exist", async () => {
      req.body = { column_id: 99 };
      setupTaskFindOne(existingTask);
      setupColumnFindOne(null);

      await updateTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Column not found.",
        code: 404,
      });
    });

    it("clears assignee when username is not in accounts", async () => {
      req.body = { assignee: "unknown-user" };
      setupTaskFindOne(existingTask);
      setupAccountFind([]);
      setupFindOneAndUpdate({
        ...existingTask,
        assignee: "unknown-user",
      });

      await updateTask(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ assignee: "" }),
      );
    });

    it("returns 500 when database lookup fails", async () => {
      req.body = { title: "Updated" };
      vi.mocked(Task.findOne).mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error("db down")),
      } as never);

      await updateTask(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        code: 500,
      });
    });
  });
});
