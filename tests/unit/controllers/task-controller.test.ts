import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
} from "@jest/globals";
import type { NextFunction, Response } from "express";

import HttpError from "../../../src/http-error/http-error.js";
import type { AuthenticatedRequest } from "../../../src/middleware/check-auth.js";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from "../../helpers/mock-express.js";

const mockTaskFindOne = jest.fn<() => Promise<unknown>>();
const mockTaskFindOneAndUpdate = jest.fn<() => Promise<unknown>>();
const mockTaskCountDocuments = jest.fn<() => Promise<number>>();
const mockTaskUpdateMany = jest.fn<() => Promise<unknown>>();
const mockTaskCreate = jest.fn<() => Promise<unknown>>();
const mockTaskDeleteOne = jest.fn<() => Promise<unknown>>();
const mockColumnFindOne = jest.fn<() => Promise<unknown>>();
const mockAccountFind = jest.fn<() => { select: jest.Mock }>();

await jest.unstable_mockModule("../../../src/models/task.js", () => ({
  Task: {
    findOne: mockTaskFindOne,
    findOneAndUpdate: mockTaskFindOneAndUpdate,
    countDocuments: mockTaskCountDocuments,
    updateMany: mockTaskUpdateMany,
    create: mockTaskCreate,
    deleteOne: mockTaskDeleteOne,
  },
}));

await jest.unstable_mockModule("../../../src/models/column.js", () => ({
  Column: {
    findOne: mockColumnFindOne,
  },
}));

await jest.unstable_mockModule("../../../src/models/account.js", () => ({
  Account: {
    find: mockAccountFind,
  },
}));

const { createTask, deleteTask, updateTask } = await import(
  "../../../src/controllers/task-controller.js"
);

const existingTask = {
  taskId: 1,
  title: "Welcome Task",
  description: "Drag me",
  assignee: "demo",
  columnId: 1,
  position: 0,
};

const setupAccountFind = (usernames: string[] = ["demo"]) => {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(
    usernames.map((username) => ({ username })),
  );
  const select = jest.fn().mockReturnValue({ lean });
  mockAccountFind.mockReturnValue({ select });
  return { select, lean };
};

const setupTaskFindOne = (task: unknown) => {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(task);
  mockTaskFindOne.mockReturnValue({ lean });
  return lean;
};

const setupFindOneAndUpdate = (task: Record<string, unknown>) => {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(task);
  mockTaskFindOneAndUpdate.mockReturnValue({ lean });
  return lean;
};

const setupNextTaskId = (lastTaskId: number | null) => {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(
    lastTaskId === null ? null : { taskId: lastTaskId },
  );
  const select = jest.fn().mockReturnValue({ lean });
  const sort = jest.fn().mockReturnValue({ select });
  mockTaskFindOne.mockReturnValue({ sort });
  return { sort, select, lean };
};

const setupColumnFindOne = (column: unknown) => {
  mockColumnFindOne.mockReturnValue({
    lean: jest.fn().mockResolvedValue(column),
  });
};

describe("task-controller", () => {
  let req: AuthenticatedRequest;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest({ userId: "1" }) as AuthenticatedRequest;
    req.params = { taskId: "1" };
    res = createMockResponse();
    next = createMockNext();
    mockTaskUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    setupAccountFind();
  });

  describe("createTask", () => {
    beforeEach(() => {
      req.params = {};
      req.body = {};
    });

    it("returns 400 when title is missing", async () => {
      req.body = { column_id: 1 };

      await createTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Title must be a non-empty string.",
        code: 400,
      });
    });

    it("returns 400 when column_id is invalid", async () => {
      req.body = { title: "New Task", column_id: 0 };

      await createTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "column_id must be a positive integer.",
        code: 400,
      });
    });

    it("returns 404 when column does not exist", async () => {
      req.body = { title: "New Task", column_id: 1 };
      setupColumnFindOne(null);

      await createTask(req, res, next);

      expect(mockColumnFindOne).toHaveBeenCalledWith({ columnId: 1 });
      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
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
      mockTaskCountDocuments.mockResolvedValue(2);
      setupNextTaskId(5);
      mockTaskCreate.mockResolvedValue({
        toObject: jest.fn().mockReturnValue({
          taskId: 6,
          title: "New Task",
          description: "Details",
          assignee: "demo",
          columnId: 1,
          position: 2,
        }),
      });

      await createTask(req, res, next);

      expect(mockTaskUpdateMany).toHaveBeenCalledWith(
        { columnId: 1, position: { $gte: 2 } },
        { $inc: { position: 1 } },
      );
      expect(mockTaskCreate).toHaveBeenCalledWith({
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
      req.body = { title: "New Task", assignee: "unknown-user", column_id: 1 };
      setupColumnFindOne({ columnId: 1, boardId: 1 });
      mockTaskCountDocuments.mockResolvedValue(0);
      setupNextTaskId(null);
      setupAccountFind([]);
      mockTaskCreate.mockResolvedValue({
        toObject: jest.fn().mockReturnValue({
          taskId: 1,
          title: "New Task",
          description: "",
          assignee: "unknown-user",
          columnId: 1,
          position: 0,
        }),
      });

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

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Invalid task id.",
        code: 400,
      });
    });

    it("returns 404 when task is not found", async () => {
      setupTaskFindOne(null);

      await deleteTask(req, res, next);

      expect(mockTaskFindOne).toHaveBeenCalledWith({ taskId: 1 });
      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Task not found.",
        code: 404,
      });
    });

    it("deletes task and returns the removed task", async () => {
      setupTaskFindOne(existingTask);
      mockTaskDeleteOne.mockResolvedValue({ deletedCount: 1 });

      await deleteTask(req, res, next);

      expect(mockTaskDeleteOne).toHaveBeenCalledWith({ taskId: 1 });
      expect(mockTaskUpdateMany).toHaveBeenCalledWith(
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
      const lean = jest.fn().mockRejectedValue(new Error("db down"));
      mockTaskFindOne.mockReturnValue({ lean });

      await deleteTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({ code: 500 });
    });
  });

  describe("updateTask", () => {
    it("returns 400 for invalid task id", async () => {
      req.params = { taskId: "abc" };

      await updateTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Invalid task id.",
        code: 400,
      });
    });

    it("returns 400 when body id is 0", async () => {
      req.body = { id: 0, title: "New Task" };

      await updateTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Cannot create a task with PUT. Use POST /api/tasks instead.",
        code: 400,
      });
    });

    it("returns 400 when body id does not match URL id", async () => {
      req.body = { id: 2, title: "Updated" };

      await updateTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Body id must match the task id in the URL.",
        code: 400,
      });
    });

    it("returns 404 when task is not found", async () => {
      req.body = { title: "Updated" };
      setupTaskFindOne(null);

      await updateTask(req, res, next);

      expect(mockTaskFindOne).toHaveBeenCalledWith({ taskId: 1 });
      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
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

      expect(mockTaskFindOneAndUpdate).toHaveBeenCalledWith(
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
      mockColumnFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ columnId: 2, boardId: 1 }),
      });
      mockTaskCountDocuments.mockResolvedValue(1);
      setupFindOneAndUpdate({
        ...existingTask,
        columnId: 2,
        position: 1,
      });

      await updateTask(req, res, next);

      expect(mockTaskUpdateMany).toHaveBeenCalledTimes(2);
      expect(mockTaskFindOneAndUpdate).toHaveBeenCalledWith(
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
      mockColumnFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ columnId: 2, boardId: 1 }),
      });
      mockTaskCountDocuments.mockResolvedValue(2);
      setupFindOneAndUpdate({
        ...existingTask,
        columnId: 2,
        position: 2,
      });

      await updateTask(req, res, next);

      expect(mockTaskFindOneAndUpdate).toHaveBeenCalledWith(
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
      mockColumnFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await updateTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
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
      const lean = jest.fn().mockRejectedValue(new Error("db down"));
      mockTaskFindOne.mockReturnValue({ lean });

      await updateTask(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({ code: 500 });
    });
  });
});
