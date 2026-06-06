import { vi } from "vitest";
import type { NextFunction, Response } from "express";
import type { AuthenticatedRequest } from "../../src/middleware/check-auth.js";

/** Minimal mock Express response for controller unit tests. */
export const createMockResponse = () => {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
};

/** Mock Express request with optional body and headers. */
export const createMockRequest = (
  overrides: Partial<AuthenticatedRequest> = {},
): AuthenticatedRequest => ({
  body: {},
  headers: {},
  method: "GET",
  ...overrides,
}) as AuthenticatedRequest;

/** Spy on Express next — captures HttpError passed from controllers. */
export const createMockNext = () => vi.fn() as NextFunction;
