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

await jest.unstable_mockModule("../../../src/models/board.js", () => ({
  Board: { find: mockBoardFind },
}));

const { getAllBoards } = await import(
  "../../../src/controllers/board-controller.js"
);

/** Builds a chainable mock for Board.find().sort().lean(). */
const setupBoardFindChain = (result: unknown) => {
  const lean = jest.fn<() => Promise<unknown>>().mockResolvedValue(result);
  const sort = jest.fn().mockReturnValue({ lean });
  mockBoardFind.mockReturnValue({ sort });
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
      setupBoardFindChain([
        {
          boardId: 1,
          name: "My Board",
          columns: [
            {
              columnId: 1,
              name: "To Do",
              position: 0,
              boardId: 1,
              tasks: [
                {
                  taskId: 1,
                  title: "Welcome Task",
                  description: "Drag me",
                  assignee: "",
                  columnId: 1,
                  position: 0,
                },
              ],
            },
          ],
        },
      ]);

      await getAllBoards(req, res, next);

      expect(mockBoardFind).toHaveBeenCalled();
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
                      assignee: "",
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
      setupBoardFindChain([]);

      await getAllBoards(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { boards: [] },
      });
    });

    it("sorts boards by boardId ascending", async () => {
      const { sort } = setupBoardFindChain([]);

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
