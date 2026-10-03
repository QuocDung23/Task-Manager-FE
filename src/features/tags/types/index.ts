import type { TaskTagSummary } from "@/features/tasks/types";

export type TagStatus = "ACTIVE" | "INACTIVE";

export type TagResponse = {
  id: string;
  boardId: string;
  name: string;
  color: string;
  status: TagStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type GetTagsParams = {
  name?: string;
  includeDeleted?: boolean;
};

export type CreateTagRequest = {
  name: string;
  color?: string;
};

export type UpdateTagRequest = {
  name?: string;
  color?: string;
};

export type GetTasksByTagParams = {
  listId?: string;
  name?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export type GetTasksByTagResponse = {
  tag: TaskTagSummary;
  tasks: import("@/features/tasks/types").TaskResponse[];
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};
