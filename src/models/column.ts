import mongoose from "mongoose";
import { type IColumn } from "./column-types.js";

const Schema = mongoose.Schema;

/** Column schema stored in its own collection. */
const columnSchema = new Schema<IColumn>(
  {
    columnId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true },
    position: { type: Number, required: true },
    boardId: { type: Number, required: true, index: true },
  },
  { timestamps: true, collection: "columns" },
);

/** Model used by seed and GET /api/boards aggregation. */
export const Column = mongoose.model<IColumn>("Column", columnSchema);
