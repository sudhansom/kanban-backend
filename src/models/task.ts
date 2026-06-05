import mongoose from "mongoose";
import { type ITask } from "./task-types.js";

const Schema = mongoose.Schema;

/** Task schema stored in its own collection. */
const taskSchema = new Schema<ITask>(
  {
    taskId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    assignee: { type: String, default: "" },
    columnId: { type: Number, required: true, index: true },
    position: { type: Number, required: true },
  },
  { timestamps: true, collection: "tasks" },
);

/** Model used by seed and GET /api/boards aggregation. */
export const Task = mongoose.model<ITask>("Task", taskSchema);
