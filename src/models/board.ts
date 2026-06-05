import mongoose from "mongoose";
import { type IBoard } from "./board-types.js";

const Schema = mongoose.Schema;

/** Board schema stored separately from columns and tasks. */
const boardSchema = new Schema<IBoard>(
  {
    boardId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
  },
  { timestamps: true, collection: "boards" },
);

/** Model used by seed and GET /api/boards aggregation. */
export const Board = mongoose.model<IBoard>("Board", boardSchema);
