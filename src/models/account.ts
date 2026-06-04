import mongoose from "mongoose";
import { type IAccount } from "./account-types.js";

const Schema = mongoose.Schema;

/**
 * Mongoose schema for login accounts.
 * Collection name: `accounts`
 */
const accountSchema = new Schema<IAccount>(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true, collection: "accounts" },
);

/** Model used to find accounts and verify passwords on POST /api/accounts. */
export const Account = mongoose.model<IAccount>("Account", accountSchema);
