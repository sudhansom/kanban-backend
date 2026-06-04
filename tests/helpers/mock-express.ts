import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

/** Minimal mock Express response for controller unit tests. */
export const createMockResponse = () => {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
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
export const createMockNext = () => jest.fn() as NextFunction;
