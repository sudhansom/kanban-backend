/** Task document stored in the `tasks` collection. */
export interface ITask {
  taskId: number;
  title: string;
  description: string;
  assignee: string;
  columnId: number;
  position: number;
}
