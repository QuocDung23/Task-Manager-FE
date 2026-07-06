export type TaskStatus = "ACTIVE" | "INACTIVE";

export type TaskResponse = {
  id: string;
  name: string;
  description?: string;
  orderTask: number;
  dueDate?: string;
  listId: string;
  assign: string[];
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTaskRequest = {
  name: string;
  description?: string;
};

export type TaskApiResponse = {
  success: boolean;
  data: TaskResponse[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type MoveTaskRequest = {
  sourceListId: string;
  targetListId: string;
  orderedTaskIds: string[];
};

export type MoveTaskResponse = {
  movedTask: TaskResponse;
  sourceTasks: TaskResponse[];
  targetTasks: TaskResponse[];
};
