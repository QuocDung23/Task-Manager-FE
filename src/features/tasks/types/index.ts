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
  | (string & {});

export type TaskTagFilterMode = "ANY" | "ALL";

export type TaskTagSummary = {
  id: string;
  name: string;
  color: string;
};

export type ReminderPresetId =
  | "AT_TIME"
  | "BEFORE_15"
  | "BEFORE_30"
  | "BEFORE_60"
  | "BEFORE_DAY"
  | "CUSTOM";

export type TaskResponse = {
  id: string;
  name: string;
  description?: string;
  orderTask: number;
  dueDate: string | null;
  reminderAt: string | null;
  reminderSentAt: string | null;
  overdueNotifiedAt: string | null;
  lockedAt: string | null;
  lockStatus: TaskLockStatus;
  lockReason: string | null;
  rescheduleCount: number;
  completedAt: string | null;
  isLocked: boolean;
  isOverdue: boolean;
  scheduleState: TaskScheduleState;
  listId: string;
  assign: string[];
  tags: TaskTagSummary[];
  status: TaskStatus;
  statusAction?: TaskStatusAction;
  tagVersion: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTaskRequest = {
  name: string;
  description?: string;
  dueDate?: string;
  reminderAt?: string;
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

export type TaskListFilters = {
  tagIds?: string[];
  tagMode?: TaskTagFilterMode;
  scheduleState?: TaskScheduleState;
  lockStatus?: TaskLockStatus;
  dueBefore?: string;
  dueAfter?: string;
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

export type ClearTaskScheduleRequest = {
  reason?: string;
};

export type UnlockTaskRequest = {
  reason: string;
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

export type ReplaceTaskTagsRequest = {
  tagIds: string[];
};
