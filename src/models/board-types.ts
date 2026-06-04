export interface ITask {
  taskId: number;
  title: string;
  description: string;
  assignee: string;
  columnId: number;
  position: number;
}

export interface IColumn {
  columnId: number;
  name: string;
  position: number;
  boardId: number;
  tasks: ITask[];
}

export interface IBoard {
  boardId: number;
  name: string;
  columns: IColumn[];
}
