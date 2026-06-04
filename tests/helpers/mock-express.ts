import { vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

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
  overrides: Partial<Request> = {},
): Request => ({
  body: {},
  headers: {},
  method: "GET",
  ...overrides,
}) as Request;

/** Spy on Express next — captures HttpError passed from controllers. */
export const createMockNext = () => vi.fn() as NextFunction;
