/** A single task card inside a column (embedded in a board document). */
export interface ITask {
  taskId: number;
  title: string;
  description: string;
  assignee: string;
  columnId: number;
  position: number;
}

/** A Kanban column with its tasks (embedded in a board document). */
export interface IColumn {
  columnId: number;
  name: string;
  position: number;
  boardId: number;
  tasks: ITask[];
}

/**
 * A Kanban board with nested columns and tasks.
 * Stored as one MongoDB document per board (no separate task/column collections).
 */
export interface IBoard {
  boardId: number;
  name: string;
  columns: IColumn[];
}
