import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Response } from "express";

import { updateTask } from "../../../src/controllers/task-controller.js";
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
};

const setupFindOneAndUpdate = (task: Record<string, unknown>) => {
  const lean = vi.fn().mockResolvedValue(task);
  vi.mocked(Task.findOneAndUpdate).mockReturnValue({ lean } as never);
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
      vi.mocked(Column.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ columnId: 2, boardId: 1 }),
      } as never);
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
      vi.mocked(Column.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue({ columnId: 2, boardId: 1 }),
      } as never);
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
      vi.mocked(Column.findOne).mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      } as never);

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
