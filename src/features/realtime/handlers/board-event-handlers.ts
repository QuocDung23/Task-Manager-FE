import type { QueryClient } from "@tanstack/react-query";
import type { TypedSocket } from "../socket";
import type {
  BoardCreatedPayload,
  BoardDeletedPayload,
  BoardMemberAddedPayload,
  BoardMemberRemovedPayload,
  BoardMemberRoleUpdatedPayload,
  BoardUpdatedPayload,
} from "../contracts/realtime-events";
import type { BoardMemberUser, BoardResponse } from "@/features/boards/types";
import { rememberEvent } from "../utils/event-dedupe";
import {
  applyBoardCreated,
  applyBoardDeleted,
  applyBoardMemberAdded,
  applyBoardMemberRemoved,
  applyBoardMemberRoleUpdated,
  applyBoardUpdated,
} from "@/features/boards/utils/board-cache";

function isBoardResponse(value: unknown): value is BoardResponse {
  if (!value || typeof value !== "object") return false;
  const board = value as Partial<BoardResponse>;
  return (
    typeof board.id === "string" &&
    typeof board.name === "string" &&
    typeof board.projectId === "string"
  );
}

function isBoardMemberUser(value: unknown): value is BoardMemberUser {
  if (!value || typeof value !== "object") return false;
  const member = value as Partial<BoardMemberUser>;
  return (
    typeof member.id === "string" &&
    typeof member.boardMemberId === "string" &&
    typeof member.roleId === "string"
  );
}

function isBoardCreatedPayload(value: unknown): value is BoardCreatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardCreatedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    isBoardResponse(payload.data?.board) &&
    payload.data.board.projectId === payload.data.projectId
  );
}

function isBoardUpdatedPayload(value: unknown): value is BoardUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardUpdatedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.boardId === "string" &&
    isBoardResponse(payload.data?.board) &&
    payload.data.board.id === payload.data.boardId &&
    payload.data.board.projectId === payload.data.projectId
  );
}

function isBoardDeletedPayload(value: unknown): value is BoardDeletedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardDeletedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.boardId === "string" &&
    payload.data.board.id === payload.data.boardId
  );
}

function isBoardMemberAddedPayload(
  value: unknown,
): value is BoardMemberAddedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardMemberAddedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.boardId === "string" &&
    isBoardMemberUser(payload.data?.member)
  );
}

function isBoardMemberRemovedPayload(
  value: unknown,
): value is BoardMemberRemovedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardMemberRemovedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.boardId === "string" &&
    typeof payload.data?.memberId === "string" &&
    typeof payload.data?.userId === "string"
  );
}

function isBoardMemberRoleUpdatedPayload(
  value: unknown,
): value is BoardMemberRoleUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BoardMemberRoleUpdatedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.boardId === "string" &&
    isBoardMemberUser(payload.data?.member)
  );
}

export function registerBoardEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleCreated = (payload: BoardCreatedPayload): void => {
    if (!isBoardCreatedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyBoardCreated(queryClient, payload.data.projectId, payload.data.board);
  };

  const handleUpdated = (payload: BoardUpdatedPayload): void => {
    if (!isBoardUpdatedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyBoardUpdated(queryClient, payload.data.projectId, payload.data.board);
  };

  const handleDeleted = (payload: BoardDeletedPayload): void => {
    if (!isBoardDeletedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyBoardDeleted(
      queryClient,
      payload.data.projectId,
      payload.data.boardId,
    );
  };

  const handleMemberAdded = (payload: BoardMemberAddedPayload): void => {
    if (!isBoardMemberAddedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyBoardMemberAdded(
      queryClient,
      payload.data.boardId,
      payload.data.member,
    );
  };

  const handleMemberRemoved = (payload: BoardMemberRemovedPayload): void => {
    if (!isBoardMemberRemovedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyBoardMemberRemoved(
      queryClient,
      payload.data.boardId,
      payload.data.memberId,
      payload.data.userId,
    );
  };

  const handleMemberRoleUpdated = (
    payload: BoardMemberRoleUpdatedPayload,
  ): void => {
    if (!isBoardMemberRoleUpdatedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyBoardMemberRoleUpdated(
      queryClient,
      payload.data.boardId,
      payload.data.member,
    );
  };

  socket.on("board:created", handleCreated);
  socket.on("board:updated", handleUpdated);
  socket.on("board:deleted", handleDeleted);
  socket.on("board:member_added", handleMemberAdded);
  socket.on("board:member_removed", handleMemberRemoved);
  socket.on("board:member_role_updated", handleMemberRoleUpdated);

  return () => {
    socket.off("board:created", handleCreated);
    socket.off("board:updated", handleUpdated);
    socket.off("board:deleted", handleDeleted);
    socket.off("board:member_added", handleMemberAdded);
    socket.off("board:member_removed", handleMemberRemoved);
    socket.off("board:member_role_updated", handleMemberRoleUpdated);
  };
}
