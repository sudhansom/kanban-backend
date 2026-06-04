import type { IAccount } from "../../src/models/account-types.js";

/**
 * Builds a plain object for mocked Account.findOne() results.
 * Controllers only use userId, username, passwordHash — not full Mongoose Document methods.
 */
export const fakeAccount = (overrides: Partial<IAccount> = {}) =>
  ({
    userId: "1",
    username: "demo",
    passwordHash: "hashed",
    ...overrides,
  }) as Awaited<
    ReturnType<typeof import("../../src/models/account.js").Account.findOne>
  >;
