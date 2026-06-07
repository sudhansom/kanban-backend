import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextFunction, Request, Response } from "express";

import {
  getAllAccounts,
  loginAccount,
} from "../../../src/controllers/account-controller.js";
import HttpError from "../../../src/http-error/http-error.js";
import {
  createMockNext,
  createMockRequest,
  createMockResponse,
} from "../../helpers/mock-express.js";
import { fakeAccount } from "../../helpers/mock-account.js";

vi.mock("../../../src/models/account.js", () => ({
  Account: {
    findOne: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
  },
}));

vi.mock("../../../src/utils/load-data.js", () => ({
  loadDataFile: vi.fn(),
}));

import { Account } from "../../../src/models/account.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loadDataFile } from "../../../src/utils/load-data.js";

describe("account-controller", () => {
  let req: Request;
  let res: ReturnType<typeof createMockResponse>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
  });

  describe("loginAccount", () => {
    it("calls next with 401 when username is missing", async () => {
      req.body = { password: "demo1234" };

      await loginAccount(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).code).toBe(401);
      expect(res.status).not.toHaveBeenCalled();
      expect(error.message).toEqual("Invalid username or password");
    });

    it("calls next with 401 when password is missing", async () => {
      req.body = { username: "demo" };

      await loginAccount(req, res, next);

      expect(next).toHaveBeenCalledOnce();

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Invalid username or password",
        code: 401,
      });
    });

    it("calls next with 401 when account is not found", async () => {
      req.body = { username: "demo", password: "demo1234" };
      vi.mocked(Account.findOne).mockResolvedValue(null);

      await loginAccount(req, res, next);

      expect(Account.findOne).toHaveBeenCalledWith({ username: "demo" });
      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        message: "Invalid username or password",
        code: 401,
      });
    });

    it("calls next with 401 when password does not match", async () => {
      req.body = { username: "demo", password: "wrong" };
      vi.mocked(Account.findOne).mockResolvedValue(fakeAccount());
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await loginAccount(req, res, next);

      expect(bcrypt.compare).toHaveBeenCalledWith("wrong", "hashed");
      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        code: 401,
      });
    });

    it("returns 200 with userId and token on successful login", async () => {
      req.body = { username: "Demo", password: "demo1234" };
      vi.mocked(Account.findOne).mockResolvedValue(fakeAccount());
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      vi.mocked(jwt.sign).mockReturnValue("fake-jwt-token" as never);

      await loginAccount(req, res, next);

      expect(Account.findOne).toHaveBeenCalledWith({ username: "demo" });
      expect(jwt.sign).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { userId: "1", token: "fake-jwt-token" },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("calls next with 500 when database lookup fails", async () => {
      req.body = { username: "demo", password: "demo1234" };
      vi.mocked(Account.findOne).mockRejectedValue(new Error("db down"));

      await loginAccount(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
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
      vi.mocked(loadDataFile).mockReturnValue({
        accounts: mockAccounts,
        boards: [],
      });

      await getAllAccounts(req, res, next);

      expect(loadDataFile).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockAccounts);
      expect(next).not.toHaveBeenCalled();
    });

    it("returns empty array when data file has no accounts", async () => {
      vi.mocked(loadDataFile).mockReturnValue({
        accounts: [],
        boards: [],
      });

      await getAllAccounts(req, res, next);

      expect(loadDataFile).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
      expect(next).not.toHaveBeenCalled();
    });

    it("does not require authentication (public login-screen endpoint)", async () => {
      req = createMockRequest({ headers: {} });
      vi.mocked(loadDataFile).mockReturnValue({
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
      vi.mocked(loadDataFile).mockImplementation(() => {
        throw new Error("file missing");
      });

      await getAllAccounts(req, res, next);

      expect((next as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
        code: 500,
      });
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
