import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
} from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

import HttpError from "../../../src/http-error/http-error.js";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from "../../helpers/mock-express.js";

const mockFindOne = jest.fn<() => Promise<unknown>>();
const mockBcryptCompare = jest.fn<() => Promise<boolean>>();
const mockJwtSign = jest.fn<() => string>();
const mockLoadDataFile = jest.fn<() => { accounts: unknown[]; boards: unknown[] }>();

await jest.unstable_mockModule("../../../src/models/account.js", () => ({
  Account: { findOne: mockFindOne },
}));

await jest.unstable_mockModule("bcryptjs", () => ({
  default: { compare: mockBcryptCompare },
}));

await jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { sign: mockJwtSign },
}));

await jest.unstable_mockModule("../../../src/utils/load-data.js", () => ({
  loadDataFile: mockLoadDataFile,
}));

const { getAllAccounts, loginAccount } = await import(
  "../../../src/controllers/account-controller.js"
);

describe("account-controller", () => {
  let req: Request;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  describe("loginAccount", () => {
    it("calls next with 401 when username is missing", async () => {
      req.body = { password: "demo1234" };

      await loginAccount(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = (next as jest.Mock).mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe(401);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("calls next with 401 when password is missing", async () => {
      req.body = { username: "demo" };

      await loginAccount(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        message: "Invalid username or password",
        code: 401,
      });
    });

    it("calls next with 401 when account is not found", async () => {
      req.body = { username: "demo", password: "demo1234" };
      mockFindOne.mockResolvedValue(null);

      await loginAccount(req, res, next);

      expect(mockFindOne).toHaveBeenCalledWith({ username: "demo" });
      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        code: 401,
      });
    });

    it("calls next with 401 when password does not match", async () => {
      req.body = { username: "demo", password: "wrong" };
      mockFindOne.mockResolvedValue({
        userId: "1",
        username: "demo",
        passwordHash: "hashed",
      });
      mockBcryptCompare.mockResolvedValue(false);

      await loginAccount(req, res, next);

      expect(mockBcryptCompare).toHaveBeenCalledWith("wrong", "hashed");
      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        code: 401,
      });
    });

    it("returns 200 with userId and token on successful login", async () => {
      req.body = { username: "Demo", password: "demo1234" };
      mockFindOne.mockResolvedValue({
        userId: "1",
        username: "demo",
        passwordHash: "hashed",
      });
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign.mockReturnValue("fake-jwt-token");

      await loginAccount(req, res, next);

      expect(mockFindOne).toHaveBeenCalledWith({ username: "demo" });
      expect(mockJwtSign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { userId: "1", token: "fake-jwt-token" },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next with 500 when database lookup fails", async () => {
      req.body = { username: "demo", password: "demo1234" };
      mockFindOne.mockRejectedValue(new Error("db down"));

      await loginAccount(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        code: 500,
      });
    });
  });

  describe("getAllAccounts", () => {
    // GET /api/accounts is public — account-routes mounts it without isAuthenticated.

    it("returns accounts array from data file", async () => {
      const mockAccounts = [
        { id: "1", username: "demo", password_hash: "demo1234" },
        { id: "2", username: "guest", password_hash: "guest" },
      ];
      mockLoadDataFile.mockReturnValue({
        accounts: mockAccounts,
        boards: [],
      });

      await getAllAccounts(req, res, next);

      expect(mockLoadDataFile).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAccounts);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns empty array when data file has no accounts", async () => {
      mockLoadDataFile.mockReturnValue({
        accounts: [],
        boards: [],
      });

      await getAllAccounts(req, res, next);

      expect(mockLoadDataFile).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
      expect(next).not.toHaveBeenCalled();
    });

    it("does not require authentication (public login-screen endpoint)", async () => {
      req = createMockRequest({ headers: {} });
      mockLoadDataFile.mockReturnValue({
        accounts: [{ id: "1", username: "demo", password_hash: "demo1234" }],
        boards: [],
      });

      await getAllAccounts(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        { id: "1", username: "demo", password_hash: "demo1234" },
      ]);
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next with 500 when loadDataFile throws", async () => {
      mockLoadDataFile.mockImplementation(() => {
        throw new Error("file missing");
      });

      await getAllAccounts(req, res, next);

      expect((next as jest.Mock).mock.calls[0][0]).toMatchObject({
        code: 500,
      });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
