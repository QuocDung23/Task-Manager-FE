import type { QueryClient } from "@tanstack/react-query";
import type { TagResponse } from "@/features/tags/types";
import type { TaskApiResponse, TaskResponse, TaskTagSummary } from "@/features/tasks/types";
import { applyCanonicalTaskSnapshot } from "@/features/tasks/utils/task-cache";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import { tagKeys } from "@/features/tags/utils/tag-query-keys";
import { rememberEvent } from "../utils/event-dedupe";
import type {
  BoardTagPayload,
  TaskTagsUpdatedPayload,
} from "../contracts/realtime-events";
import type { TypedSocket } from "../socket";

function isTag(value: unknown): value is TagResponse {
  if (!value || typeof value !== "object") return false;
  const tag = value as Partial<TagResponse>;
  return (
    typeof tag.id === "string" &&
    typeof tag.boardId === "string" &&
    typeof tag.name === "string" &&
    typeof tag.color === "string" &&
    (tag.status === "ACTIVE" || tag.status === "INACTIVE")
  );
}

function isTask(value: unknown): value is TaskResponse {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<TaskResponse>;
  return (
    typeof task.id === "string" &&
    typeof task.listId === "string" &&
    typeof task.tagVersion === "number" &&
    Array.isArray(task.tags)
  );
}

function isTaskTagsUpdatedPayload(value: unknown): value is TaskTagsUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<TaskTagsUpdatedPayload>;
  const data = payload.data;
  return (
    typeof payload.eventId === "string" &&
    typeof data?.boardId === "string" &&
    typeof data.taskId === "string" &&
    isTask(data.task) &&
    data.task.id === data.taskId
  );
}

function isBoardTagPayload(value: unknown): value is BoardTagPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardTagPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.boardId === "string" &&
    isTag(payload.data?.tag) &&
    payload.data.tag.boardId === payload.data.boardId
  );
}

function matchesTagQuery(tag: TagResponse, params: unknown): boolean {
  if (!params || typeof params !== "object" || Array.isArray(params)) return tag.status === "ACTIVE";
  const query = params as { name?: unknown; includeDeleted?: unknown };
  if (query.includeDeleted !== true && tag.status !== "ACTIVE") return false;
  if (typeof query.name === "string" && !tag.name.toLowerCase().includes(query.name.toLowerCase())) return false;
  return true;
}

function sortTags(tags: TagResponse[]): TagResponse[] {
  return [...tags].sort((left, right) => left.name.localeCompare(right.name));
}

function applyTagCatalogToCaches(
  queryClient: QueryClient,
  eventName: "created" | "updated" | "deleted",
  payload: BoardTagPayload,
): void {
  const { boardId, tag } = payload.data;
  for (const query of queryClient.getQueryCache().findAll({ queryKey: tagKeys.boardPrefix(boardId) })) {
    const params = query.queryKey[query.queryKey.length - 1];
    queryClient.setQueryData<TagResponse[]>(query.queryKey, (old) => {
      const current = old ?? [];
      const index = current.findIndex((item) => item.id === tag.id);
      const shouldInclude = matchesTagQuery(tag, params);
      if (eventName === "deleted" && !shouldInclude) {
        return index < 0 ? current : current.filter((item) => item.id !== tag.id);
      }
      if (!shouldInclude) return index < 0 ? current : current.filter((item) => item.id !== tag.id);
      if (index < 0) return sortTags([...current, tag]);
      const next = [...current];
      next[index] = tag;
      return sortTags(next);
    });
  }

  if (eventName !== "created") {
    const affectedTasks = new Map<string, TaskResponse>();
    const updateTask = (task: TaskResponse): TaskResponse => {
      const tags =
        eventName === "deleted"
          ? task.tags.filter((item) => item.id !== tag.id)
          : task.tags.map((item) =>
              item.id === tag.id
                ? ({ id: item.id, name: tag.name, color: tag.color } satisfies TaskTagSummary)
                : item,
            );
      const updatedTask = { ...task, tags };
      affectedTasks.set(updatedTask.id, updatedTask);
      return updatedTask;
    };

    for (const query of queryClient.getQueryCache().findAll({ queryKey: taskKeys.lists() })) {
      queryClient.setQueryData<TaskApiResponse>(
        query.queryKey,
        (old) => {
          if (!old || !Array.isArray(old.data)) return old;
          return {
            ...old,
            data: old.data.map(updateTask),
          };
        },
      );
    }

    for (const query of queryClient.getQueryCache().findAll({ queryKey: taskKeys.all })) {
      const key = query.queryKey;
      if (key[1] !== "detail" || typeof key[2] !== "string") continue;
      queryClient.setQueryData<TaskResponse>(key, (old) => (old ? updateTask(old) : old));
    }

    if (eventName === "deleted") {
      for (const task of affectedTasks.values()) {
        applyCanonicalTaskSnapshot(queryClient, task, { source: "socket" });
      }
    }
  }

  for (const query of queryClient.getQueryCache().findAll({ queryKey: tagKeys.tasksPrefix(boardId) })) {
    queryClient.setQueryData<{ tag: TaskTagSummary; tasks: TaskResponse[] } | undefined>(
      query.queryKey,
      (old) => {
        if (!old) return old;
        const tagId = query.queryKey[3];
        if (eventName === "updated" && tagId === tag.id) {
          return { ...old, tag: { ...old.tag, name: tag.name, color: tag.color } };
        }
        if (eventName === "deleted") {
          return { ...old, tasks: old.tasks.map((task) => ({ ...task, tags: task.tags.filter((item) => item.id !== tag.id) })) };
        }
        return old;
      },
    );
  }

  void queryClient.invalidateQueries({ queryKey: tagKeys.tasksPrefix(boardId) });
  if (eventName === "deleted") {
    void queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
  }
}

export function applyBoardTagCreated(
  queryClient: QueryClient,
  payload: BoardTagPayload,
): void {
  if (isBoardTagPayload(payload)) applyTagCatalogToCaches(queryClient, "created", payload);
}

export function applyBoardTagUpdated(
  queryClient: QueryClient,
  payload: BoardTagPayload,
): void {
  if (isBoardTagPayload(payload)) applyTagCatalogToCaches(queryClient, "updated", payload);
}

export function applyBoardTagDeleted(
  queryClient: QueryClient,
  payload: BoardTagPayload,
): void {
  if (isBoardTagPayload(payload)) applyTagCatalogToCaches(queryClient, "deleted", payload);
}

export function applyTaskTagsUpdated(
  queryClient: QueryClient,
  payload: TaskTagsUpdatedPayload,
): void {
  if (!isTaskTagsUpdatedPayload(payload) || !rememberEvent(payload.eventId)) return;
  applyCanonicalTaskSnapshot(queryClient, payload.data.task, { source: "socket" });
  void queryClient.invalidateQueries({ queryKey: tagKeys.tasksPrefix(payload.data.boardId) });
}

export function registerTagEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleTaskTagsUpdated = (payload: TaskTagsUpdatedPayload): void => {
    applyTaskTagsUpdated(queryClient, payload);
  };
  const handleCreated = (payload: BoardTagPayload) => {
    if (isBoardTagPayload(payload) && rememberEvent(payload.eventId)) {
      applyBoardTagCreated(queryClient, payload);
    }
  };
  const handleUpdated = (payload: BoardTagPayload) => {
    if (isBoardTagPayload(payload) && rememberEvent(payload.eventId)) {
      applyBoardTagUpdated(queryClient, payload);
    }
  };
  const handleDeleted = (payload: BoardTagPayload) => {
    if (isBoardTagPayload(payload) && rememberEvent(payload.eventId)) {
      applyBoardTagDeleted(queryClient, payload);
    }
  };

  socket.on("task:tags_updated", handleTaskTagsUpdated);
  socket.on("board:tag_created", handleCreated);
  socket.on("board:tag_updated", handleUpdated);
  socket.on("board:tag_deleted", handleDeleted);
  return () => {
    socket.off("task:tags_updated", handleTaskTagsUpdated);
    socket.off("board:tag_created", handleCreated);
    socket.off("board:tag_updated", handleUpdated);
    socket.off("board:tag_deleted", handleDeleted);
  };
}
