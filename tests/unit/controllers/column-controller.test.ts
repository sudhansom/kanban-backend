import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Response } from "express";

import { updateColumn } from "../../../src/controllers/column-controller.js";
import HttpError from "../../../src/http-error/http-error.js";
import type { AuthenticatedRequest } from "../../../src/middleware/check-auth.js";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from "../../helpers/mock-express.js";

vi.mock("../../../src/models/column.js", () => ({
  Column: {
    findOne: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));

import { Column } from "../../../src/models/column.js";

const createColumnDoc = (overrides: Record<string, unknown> = {}) => ({
  columnId: 1,
  name: "To Do",
  position: 0,
  boardId: 1,
  save: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe("column-controller", () => {
  let req: AuthenticatedRequest;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockRequest({ userId: "1" }) as AuthenticatedRequest;
    req.params = { columnId: "1" };
    res = createMockResponse();
    next = createMockNext();
    vi.mocked(Column.updateMany).mockResolvedValue({ modifiedCount: 1 } as never);
  });

  describe("updateColumn", () => {
    it("returns 400 for invalid column id", async () => {
      req.params = { columnId: "0" };

      await updateColumn(req, res, next);

      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe(400);
      expect(Column.findOne).not.toHaveBeenCalled();
    });

    it("returns 400 when no updatable fields are sent", async () => {
      req.body = {};

      await updateColumn(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "At least one of name or position is required.",
        code: 400,
      });
    });

    it("returns 404 when column is not found", async () => {
      req.body = { name: "Done" };
      vi.mocked(Column.findOne).mockResolvedValue(null);

      await updateColumn(req, res, next);

      expect(Column.findOne).toHaveBeenCalledWith({ columnId: 1 });
      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Column not found.",
        code: 404,
      });
    });

    it("updates column name and returns API shape", async () => {
      const column = createColumnDoc();
      req.body = { name: "In Progress" };
      vi.mocked(Column.findOne).mockResolvedValue(column);
      vi.mocked(Column.countDocuments).mockResolvedValue(3);

      await updateColumn(req, res, next);

      expect(column.name).toBe("In Progress");
      expect(column.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          column: {
            id: 1,
            name: "In Progress",
            position: 0,
            board_id: 1,
          },
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("reorders sibling columns when position changes", async () => {
      const column = createColumnDoc({ position: 0 });
      req.body = { position: 2 };
      vi.mocked(Column.findOne).mockResolvedValue(column);
      vi.mocked(Column.countDocuments).mockResolvedValue(3);

      await updateColumn(req, res, next);

      expect(Column.updateMany).toHaveBeenCalledWith(
        {
          boardId: 1,
          columnId: { $ne: 1 },
          position: { $gt: 0, $lte: 2 },
        },
        { $inc: { position: -1 } },
      );
      expect(column.position).toBe(2);
      expect(column.save).toHaveBeenCalled();
    });

    it("clamps sentinel position 1111 to the last valid slot", async () => {
      const column = createColumnDoc({ position: 1 });
      req.body = { position: 1111 };
      vi.mocked(Column.findOne).mockResolvedValue(column);
      vi.mocked(Column.countDocuments).mockResolvedValue(4);

      await updateColumn(req, res, next);

      expect(column.position).toBe(3);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          column: {
            id: 1,
            name: "To Do",
            position: 3,
            board_id: 1,
          },
        },
      });
    });

    it("returns 500 when save fails", async () => {
      const column = createColumnDoc({
        save: vi.fn().mockRejectedValue(new Error("db error")),
      });
      req.body = { name: "Done" };
      vi.mocked(Column.findOne).mockResolvedValue(column);
      vi.mocked(Column.countDocuments).mockResolvedValue(1);

      await updateColumn(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        code: 500,
      });
    });
  });
});
