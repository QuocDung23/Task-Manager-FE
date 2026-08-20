import type { QueryClient } from "@tanstack/react-query";
import type {
  BoardListsReorderedPayload,
  ServerToClientEvents,
} from "../contracts/realtime-events";
import { applyCanonicalListBoardSnapshot } from "@/features/lists/utils/list-cache";
import { listKeys } from "@/features/lists/utils/list-query-keys";
import { rememberEvent } from "../utils/event-dedupe";
import { tryAdvanceBoardRevision } from "../utils/board-revision";
import type { ListResponse } from "@/features/lists/types";
import type { TypedSocket } from "../socket";

function isList(value: unknown): value is ListResponse {
  if (!value || typeof value !== "object") return false;
  const list = value as Partial<ListResponse>;
  return (
    typeof list.id === "string" &&
    typeof list.boardId === "string" &&
    typeof list.name === "string" &&
    typeof list.order === "number"
  );
}

function isPayload(value: unknown): value is BoardListsReorderedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardListsReorderedPayload>;
  const data = payload.data;
  if (typeof payload.eventId !== "string") return false;
  if (typeof data?.boardId !== "string") return false;
  if (typeof data?.orderVersion !== "number") return false;
  if (!Array.isArray(data?.lists)) return false;
  for (const list of data.lists) {
    if (!isList(list)) return false;
    if (list.boardId !== data.boardId) return false;
  }
  return true;
}

export function applyBoardListsReordered(
  queryClient: QueryClient,
  payload: BoardListsReorderedPayload,
  options: { fallbackInvalidate?: boolean } = {},
): void {
  if (!isPayload(payload)) return;
  if (!rememberEvent(payload.eventId)) return;

  const { boardId, lists } = payload.data;

  // Revision gate: skip stale snapshots.
  if (!tryAdvanceBoardRevision(boardId, payload.data.orderVersion)) {
    if (import.meta.env.DEV) {
      console.debug("[realtime] board:lists_reordered stale revision", {
        boardId,
        eventId: payload.eventId,
        revision: payload.data.orderVersion,
      });
    }
    return;
  }

  const result = applyCanonicalListBoardSnapshot(queryClient, boardId, lists);
  if (result === "invalidated" && options.fallbackInvalidate !== false) {
    void queryClient.invalidateQueries({ queryKey: listKeys.boardPrefix(boardId) });
  }
}

export function registerListOrderEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleListsReordered: ServerToClientEvents["board:lists_reordered"] = (
    payload,
  ) => {
    applyBoardListsReordered(queryClient, payload);
  };

  socket.on("board:lists_reordered", handleListsReordered);
  return () => {
    socket.off("board:lists_reordered", handleListsReordered);
  };
}
