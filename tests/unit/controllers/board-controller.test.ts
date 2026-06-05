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

const mockBoardFind = jest.fn<() => { sort: jest.Mock }>();
const mockColumnFind = jest.fn<() => { sort: jest.Mock }>();
const mockTaskFind = jest.fn<() => { sort: jest.Mock }>();
const mockAccountFind = jest.fn<() => { select: jest.Mock }>();

await jest.unstable_mockModule("../../../src/models/board.js", () => ({
  Board: { find: mockBoardFind },
}));

await jest.unstable_mockModule("../../../src/models/column.js", () => ({
  Column: { find: mockColumnFind },
}));

await jest.unstable_mockModule("../../../src/models/task.js", () => ({
  Task: { find: mockTaskFind },
}));

await jest.unstable_mockModule("../../../src/models/account.js", () => ({
  Account: { find: mockAccountFind },
}));

const { getAllBoards } = await import(
  "../../../src/controllers/board-controller.js"
);

const setupFindChain = (
  mockFind: jest.Mock,
  result: unknown,
) => {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(result);
  const sort = jest.fn().mockReturnValue({ lean });
  mockFind.mockReturnValue({ sort });
  return { sort, lean };
};

describe("board-controller", () => {
  let req: AuthenticatedRequest;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest({ userId: "1" }) as AuthenticatedRequest;
    res = createMockResponse();
    next = createMockNext();
  });

  describe("getAllBoards", () => {
    it("returns boards mapped to API shape with snake_case fields", async () => {
      setupFindChain(mockBoardFind, [{ boardId: 1, name: "My Board" }]);
      setupFindChain(mockColumnFind, [
        { columnId: 1, name: "To Do", position: 0, boardId: 1 },
      ]);
      setupFindChain(mockTaskFind, [
        {
          taskId: 1,
          title: "Welcome Task",
          description: "Drag me",
          assignee: "demo",
          columnId: 1,
          position: 0,
        },
      ]);
      const accountLean = jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue([{ username: "demo" }]);
      const select = jest.fn().mockReturnValue({ lean: accountLean });
      mockAccountFind.mockReturnValue({ select });

      await getAllBoards(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          boards: [
            {
              id: 1,
              name: "My Board",
              columns: [
                {
                  id: 1,
                  name: "To Do",
                  position: 0,
                  board_id: 1,
                  tasks: [
                    {
                      id: 1,
                      title: "Welcome Task",
                      description: "Drag me",
                      assignee: "demo",
                      column_id: 1,
                      position: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("returns empty boards array when database has no boards", async () => {
      setupFindChain(mockBoardFind, []);
      setupFindChain(mockColumnFind, []);
      setupFindChain(mockTaskFind, []);
      const accountLean = jest.fn().mockResolvedValue([]);
      mockAccountFind.mockReturnValue({
        select: jest.fn().mockReturnValue({ lean: accountLean }),
      });

      await getAllBoards(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { boards: [] },
      });
    });

    it("sorts boards by boardId ascending", async () => {
      const { sort } = setupFindChain(mockBoardFind, []);
      setupFindChain(mockColumnFind, []);
      setupFindChain(mockTaskFind, []);
      mockAccountFind.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      await getAllBoards(req, res, next);

      expect(sort).toHaveBeenCalledWith({ boardId: 1 });
    });

    it("calls next with 500 when database query fails", async () => {
      const lean = jest.fn().mockRejectedValue(new Error("db error"));
      const sort = jest.fn().mockReturnValue({ lean });
      mockBoardFind.mockReturnValue({ sort });

      await getAllBoards(req, res, next);

      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe(500);
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
