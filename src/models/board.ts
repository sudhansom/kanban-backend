import mongoose from "mongoose";
import { type IBoard, type IColumn, type ITask } from "./board-types.js";

const Schema = mongoose.Schema;

/** Embedded task sub-document (no own `_id`). */
const taskSchema = new Schema<ITask>(
  {
    taskId: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    assignee: { type: String, default: "" },
    columnId: { type: Number, required: true },
    position: { type: Number, required: true },
  },
  { _id: false },
);

/** Embedded column sub-document containing an array of tasks. */
const columnSchema = new Schema<IColumn>(
  {
    columnId: { type: Number, required: true },
    name: { type: String, required: true },
    position: { type: Number, required: true },
    boardId: { type: Number, required: true },
    tasks: { type: [taskSchema], default: [] },
  },
  { _id: false },
);

/**
 * Board schema: one document per board with columns and tasks inside.
 * Collection name: `boards`
 */
const boardSchema = new Schema<IBoard>(
  {
    boardId: { type: Number, required: true, unique: true },
    name: { type: String, required: true },
    columns: { type: [columnSchema], default: [] },
  },
  { timestamps: true, collection: "boards" },
);

/** Model used by GET /api/boards and the seed script. */
export const Board = mongoose.model<IBoard>("Board", boardSchema);
