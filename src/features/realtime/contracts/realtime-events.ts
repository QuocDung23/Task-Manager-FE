import type { TaskComment, TaskResponse } from "@/features/tasks/types";
import type { TagResponse } from "@/features/tags/types";

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

export type BoardTagPayload = RealtimeEnvelope<{
  boardId: string;
  tag: TagResponse;
}>;

export type TaskCommentCreatedPayload = { taskId: string; comment: TaskComment };
export type TaskCommentRepliedPayload = {
  taskId: string;
  parentCommentId: string;
  reply: TaskComment;
};
export type TaskCommentUpdatedPayload = { taskId: string; comment: TaskComment };
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
  "task:comment_reply_updated": (payload: TaskCommentReplyUpdatedPayload) => void;
  "task:comment_deleted": (payload: TaskCommentDeletedPayload) => void;
  "task:comment_reply_deleted": (payload: TaskCommentReplyDeletedPayload) => void;
  "task:schedule_updated": (payload: { taskId: string; task: TaskResponse }) => void;
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
  "board:tag_created": (payload: BoardTagPayload) => void;
  "board:tag_updated": (payload: BoardTagPayload) => void;
  "board:tag_deleted": (payload: BoardTagPayload) => void;
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
};
