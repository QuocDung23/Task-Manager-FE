import type {
  TaskComment,
  TaskResponse,
  TaskStatusAction,
} from "@/features/tasks/types";
import type { TagResponse } from "@/features/tags/types";
import type { ListResponse } from "@/features/lists/types";
import type {
  ProjectResponse,
  ProjectMemberResponse,
} from "@/features/projects/types";

export type RealtimeAckCode =
  | "INVALID_ID"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "INTERNAL_ERROR";

export type RealtimeAck = {
  success: boolean;
  code?: RealtimeAckCode;
  error?: string;
};

export type RealtimeEnvelope<T> = {
  eventId: string;
  occurredAt: string;
  actorId: string | null;
  data: T;
};

export type TaskTagsUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponse;
}>;

export type TaskAssignmentsUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponse;
}>;

export type TaskStatusActionUpdatedPayload = RealtimeEnvelope<{
  boardId: string;
  taskId: string;
  task: TaskResponse;
  statusAction: TaskStatusAction;
}>;

export type BoardTagPayload = RealtimeEnvelope<{
  boardId: string;
  tag: TagResponse;
}>;

export type ProjectCreatedPayload = RealtimeEnvelope<{
  project: ProjectResponse;
}>;

export type ProjectUpdatedPayload = RealtimeEnvelope<{
  project: ProjectResponse;
}>;

export type ProjectDeletedPayload = RealtimeEnvelope<{
  projectId: string;
  project: ProjectResponse;
}>;

export type ProjectMemberAddedPayload = RealtimeEnvelope<{
  projectId: string;
  member: ProjectMemberResponse;
}>;

export type ProjectMemberRemovedPayload = RealtimeEnvelope<{
  projectId: string;
  memberId: string;
  userId: string;
}>;

export type ProjectMemberRoleUpdatedPayload = RealtimeEnvelope<{
  projectId: string;
  member: ProjectMemberResponse;
}>;

export type TaskCreatedPayload = RealtimeEnvelope<{
  boardId: string;
  listId: string;
  task: TaskResponse;
}>;

export type ListCreatedPayload = RealtimeEnvelope<{
  boardId: string;
  list: ListResponse;
}>;

export type BoardListsReorderedPayload = RealtimeEnvelope<{
  boardId: string;
  orderVersion: number;
  lists: ListResponse[];
}>;

export type BoardTasksReorderedPayload = RealtimeEnvelope<{
  boardId: string;
  orderVersion: number;
  taskId: string;
  sourceListId: string;
  targetListId: string;
  movedTask: TaskResponse;
  sourceTasks: TaskResponse[];
  targetTasks: TaskResponse[];
}>;

export type TaskCommentCreatedPayload = {
  taskId: string;
  comment: TaskComment;
};
export type TaskCommentRepliedPayload = {
  taskId: string;
  parentCommentId: string;
  reply: TaskComment;
};
export type TaskCommentUpdatedPayload = {
  taskId: string;
  comment: TaskComment;
};
export type TaskCommentReplyUpdatedPayload = {
  taskId: string;
  parentCommentId: string;
  reply: TaskComment;
};
export type TaskCommentDeletedPayload = {
  taskId: string;
  commentId: string;
  comment: TaskComment;
  deletedReplyIds?: string[];
};
export type TaskCommentReplyDeletedPayload = {
  taskId: string;
  parentCommentId: string;
  replyId: string;
  reply: TaskComment;
};

export type ServerToClientEvents = {
  "task:comment_created": (payload: TaskCommentCreatedPayload) => void;
  "task:comment_replied": (payload: TaskCommentRepliedPayload) => void;
  "task:comment_updated": (payload: TaskCommentUpdatedPayload) => void;
  "task:comment_reply_updated": (
    payload: TaskCommentReplyUpdatedPayload,
  ) => void;
  "task:comment_deleted": (payload: TaskCommentDeletedPayload) => void;
  "task:comment_reply_deleted": (
    payload: TaskCommentReplyDeletedPayload,
  ) => void;
  "task:schedule_updated": (payload: {
    taskId: string;
    task: TaskResponse;
  }) => void;
  "task:rescheduled": (payload: { taskId: string; task: TaskResponse }) => void;
  "task:unlocked": (payload: { taskId: string; task: TaskResponse }) => void;
  "task:due_soon": (payload: {
    taskId: string;
    dueDate: string;
    reminderAt: string | null;
  }) => void;
  "task:overdue_locked": (payload: {
    taskId: string;
    dueDate: string;
    lockedAt: string;
    lockStatus: "OVERDUE_LOCKED" | "MANUAL_LOCKED" | "UNLOCKED";
  }) => void;
  "task:tags_updated": (payload: TaskTagsUpdatedPayload) => void;
  "task:assignments_updated": (payload: TaskAssignmentsUpdatedPayload) => void;
  "task:status_action_updated": (
    payload: TaskStatusActionUpdatedPayload,
  ) => void;
  "task:created": (payload: TaskCreatedPayload) => void;
  "list:created": (payload: ListCreatedPayload) => void;
  "board:lists_reordered": (payload: BoardListsReorderedPayload) => void;
  "board:tasks_reordered": (payload: BoardTasksReorderedPayload) => void;
  "board:tag_created": (payload: BoardTagPayload) => void;
  "board:tag_updated": (payload: BoardTagPayload) => void;
  "board:tag_deleted": (payload: BoardTagPayload) => void;
  "project:created": (payload: ProjectCreatedPayload) => void;
  "project:updated": (payload: ProjectUpdatedPayload) => void;
  "project:deleted": (payload: ProjectDeletedPayload) => void;
  "project:member_added": (payload: ProjectMemberAddedPayload) => void;
  "project:member_removed": (payload: ProjectMemberRemovedPayload) => void;
  "project:member_role_updated": (
    payload: ProjectMemberRoleUpdatedPayload,
  ) => void;
  "notification:new": (payload: {
    type: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) => void;
};

export type ClientToServerEvents = {
  "task:join": (
    payload: { taskId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
  "task:leave": (
    payload: { taskId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
  "board:join": (
    payload: { boardId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
  "board:leave": (
    payload: { boardId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
  "project:join": (
    payload: { projectId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
  "project:leave": (
    payload: { projectId: string },
    ack?: (response: RealtimeAck) => void,
  ) => void;
};
