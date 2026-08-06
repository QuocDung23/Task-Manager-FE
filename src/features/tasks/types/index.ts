export type TaskStatus = "ACTIVE" | "INACTIVE";

export type TaskLockStatus = "UNLOCKED" | "OVERDUE_LOCKED" | "MANUAL_LOCKED";

export type TaskScheduleState =
  | "none"
  | "scheduled"
  | "due_soon"
  | "overdue_locked"
  | "done";

export type TaskStatusAction =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "DONE"
  | "PAUSED"
  | "FIXED"
  | "CANCELLED"
  | "ARCHIVED"
  | "COMPLETED"
  | "CREATED"
  | "DELETED"
  | "RESTORED"
  | "UPDATED"
  | (string & {});

export type TaskResponse = {
  id: string;
  name: string;
  description?: string;
  orderTask: number;
  dueDate?: string | null;
  reminderAt?: string | null;
  lockStatus?: TaskLockStatus;
  lockReason?: string | null;
  isLocked?: boolean;
  isOverdue?: boolean;
  scheduleState?: TaskScheduleState;
  listId: string;
  assign: string[];
  status: TaskStatus;
  statusAction?: TaskStatusAction;
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

export type AssignTaskRequest = {
  userIds: string[];
};

export type SetTaskScheduleRequest = {
  dueDate: string;
  reminderAt?: string;
  reason?: string;
};

export type TaskCommentUser = {
  id: string;
  name: string;
  avatar?: string | null;
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  user?: TaskCommentUser;
  replies?: TaskComment[];
};

export type TaskCommentsResponse = {
  items: TaskComment[];
  nextCursor: string | null;
};

export type GetTaskCommentsParams = {
  cursor?: string;
  limit?: number;
  includeReplies?: boolean;
};

export type GetTaskCommentRepliesParams = {
  cursor?: string;
  limit?: number;
};

export type CreateTaskCommentRequest = {
  content: string;
};

export type UpdateTaskCommentRequest = {
  content: string;
};

export type DeleteTaskCommentResponse = {
  comment: TaskComment;
  isReply: boolean;
  parentCommentId: string | null;
  deletedReplyIds: string[];
};
