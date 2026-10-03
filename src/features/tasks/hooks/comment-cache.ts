import type {
  ApiResponse,
  DeleteTaskCommentResponse,
  TaskComment,
  TaskCommentsResponse,
} from "../types";
import type { InfiniteData, QueryClient } from "@tanstack/react-query";

export const taskCommentKeys = {
  all: ["task-comments"] as const,
  lists: () => [...taskCommentKeys.all, "list"] as const,
  list: (taskId: string) => [...taskCommentKeys.lists(), taskId] as const,
  replies: (taskId: string, commentId: string) =>
    [...taskCommentKeys.all, "replies", taskId, commentId] as const,
};

type RootData = InfiniteData<ApiResponse<TaskCommentsResponse>>;
type ReplyData = InfiniteData<ApiResponse<TaskCommentsResponse>>;

export function appendRootComment(
  queryClient: QueryClient,
  taskId: string,
  comment: TaskComment,
): void {
  queryClient.setQueryData<RootData>(
    taskCommentKeys.list(taskId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page, idx) => {
        if (idx !== 0) return page;
        const exists = page.data.items.some((c) => c.id === comment.id);
        if (exists) return page;
        return {
          ...page,
          data: {
            ...page.data,
            items: [...page.data.items, comment],
          },
        };
      });
      return { ...current, pages };
    },
  );
}

export function replaceRootComment(
  queryClient: QueryClient,
  taskId: string,
  comment: TaskComment,
): void {
  queryClient.setQueryData<RootData>(
    taskCommentKeys.list(taskId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((c) =>
            c.id === comment.id ? comment : c,
          ),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function removeRootComment(
  queryClient: QueryClient,
  taskId: string,
  commentId: string,
): void {
  queryClient.setQueryData<RootData>(
    taskCommentKeys.list(taskId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.filter((c) => c.id !== commentId),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function incrementRootReplyCount(
  queryClient: QueryClient,
  taskId: string,
  parentCommentId: string,
): void {
  queryClient.setQueryData<RootData>(
    taskCommentKeys.list(taskId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((c) =>
            c.id === parentCommentId
              ? { ...c, replyCount: c.replyCount + 1 }
              : c,
          ),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function decrementRootReplyCount(
  queryClient: QueryClient,
  taskId: string,
  parentCommentId: string,
): void {
  queryClient.setQueryData<RootData>(
    taskCommentKeys.list(taskId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((c) =>
            c.id === parentCommentId
              ? { ...c, replyCount: Math.max(0, c.replyCount - 1) }
              : c,
          ),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function appendReply(
  queryClient: QueryClient,
  taskId: string,
  parentCommentId: string,
  reply: TaskComment,
): void {
  queryClient.setQueryData<ReplyData>(
    taskCommentKeys.replies(taskId, parentCommentId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page, idx) => {
        if (idx !== 0) return page;
        const exists = page.data.items.some((c) => c.id === reply.id);
        if (exists) return page;
        return {
          ...page,
          data: {
            ...page.data,
            items: [...page.data.items, reply],
          },
        };
      });
      return { ...current, pages };
    },
  );
}

export function replaceReply(
  queryClient: QueryClient,
  taskId: string,
  parentCommentId: string,
  reply: TaskComment,
): void {
  queryClient.setQueryData<ReplyData>(
    taskCommentKeys.replies(taskId, parentCommentId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.map((c) =>
            c.id === reply.id ? reply : c,
          ),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function removeReply(
  queryClient: QueryClient,
  taskId: string,
  parentCommentId: string,
  replyId: string,
): void {
  queryClient.setQueryData<ReplyData>(
    taskCommentKeys.replies(taskId, parentCommentId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.filter((c) => c.id !== replyId),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function removeManyReplies(
  queryClient: QueryClient,
  taskId: string,
  parentCommentId: string,
  replyIds: string[],
): void {
  if (!replyIds.length) return;
  const idSet = new Set(replyIds);
  queryClient.setQueryData<ReplyData>(
    taskCommentKeys.replies(taskId, parentCommentId),
    (current) => {
      if (!current) return current;
      const pages = current.pages.map((page) => ({
        ...page,
        data: {
          ...page.data,
          items: page.data.items.filter((c) => !idSet.has(c.id)),
        },
      }));
      return { ...current, pages };
    },
  );
}

export function applyDeleteComment(
  queryClient: QueryClient,
  taskId: string,
  payload: DeleteTaskCommentResponse,
  options?: { silent?: boolean },
): void {
  const silent = options?.silent ?? false;
  const { comment, isReply, parentCommentId, deletedReplyIds } = payload;
  if (!isReply) {
    removeRootComment(queryClient, taskId, comment.id);
    if (parentCommentId) {
      removeManyReplies(queryClient, taskId, parentCommentId, deletedReplyIds);
    }
    if (!silent) {
      const removedCount = 1 + deletedReplyIds.length;
      if (removedCount > 1) {
        decrementRootReplyCount(
          queryClient,
          taskId,
          comment.id,
        );
      }
    }
    return;
  }
  if (parentCommentId) {
    removeReply(queryClient, taskId, parentCommentId, comment.id);
    decrementRootReplyCount(queryClient, taskId, parentCommentId);
  }
}
