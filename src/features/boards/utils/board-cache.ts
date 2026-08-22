import type { QueryClient } from "@tanstack/react-query";
import type {
  ApiResponse,
  BoardMemberUser,
  BoardResponse,
  PaginationResponse,
} from "../types";
import { listKeys } from "@/features/lists/utils/list-query-keys";
import { taskKeys } from "@/features/tasks/utils/task-query-keys";
import { boardKeys } from "./board-query-keys";

type BoardListCache = ApiResponse<BoardResponse[]> | undefined;
type BoardDetailCache = ApiResponse<BoardResponse> | undefined;
type BoardMembersCache = BoardMemberUser[] | undefined;

const LIST_PAGE_LIMIT_DEFAULT = 12;

function readPageFromQueryKey(
  queryKey: readonly unknown[],
): number | undefined {
  if (queryKey.length < 5) return undefined;
  const page = queryKey[3];
  return typeof page === "number" ? page : undefined;
}

function logInvalid(scope: string, payload: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[realtime] ${scope} invalid payload`, payload);
  }
}

function isActiveBoard(board: BoardResponse): boolean {
  const raw = (board as unknown as { status?: string }).status;
  return raw === undefined || raw === "ACTIVE";
}

function listMatchesNameFilter(
  queryKey: readonly unknown[],
  board: BoardResponse,
): boolean {
  // key shape: ["boards", "list", projectId, page, limit, name?]
  const filterName = queryKey[5];
  if (typeof filterName !== "string" || filterName.length === 0) return true;
  const needle = filterName.toLowerCase();
  const inName = board.name.toLowerCase().includes(needle);
  const inDescription = (board.description ?? "")
    .toLowerCase()
    .includes(needle);
  return inName || inDescription;
}

function bumpPaginationTotal(
  pagination: PaginationResponse | undefined,
  delta: number,
): PaginationResponse | undefined {
  if (!pagination || delta === 0) return pagination;
  const totalItems = Math.max(0, pagination.totalItems + delta);
  return {
    ...pagination,
    totalItems,
    totalPages: Math.max(
      1,
      Math.ceil(totalItems / Math.max(1, pagination.itemsPerPage ?? 1)),
    ),
  };
}

function insertBoardToFirstList(
  queryClient: QueryClient,
  board: BoardResponse,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: boardKeys.lists() });

  for (const entry of queries) {
    const key = entry.queryKey;
    queryClient.setQueryData<BoardListCache>(key, (old) => {
      if (!old) return old;

      if (readPageFromQueryKey(key) !== 1) return old;

      const matchesFilter = listMatchesNameFilter(key, board);
      if (!matchesFilter) return old;

      if (old.data.some((b) => b.id === board.id)) return old;

      const limit = old.pagination?.itemsPerPage ?? LIST_PAGE_LIMIT_DEFAULT;
      if (old.data.length >= limit) return old;
      const next = [board, ...old.data];
      return {
        ...old,
        data: next,
        pagination: bumpPaginationTotal(old.pagination, 1),
      };
    });
  }
}

function updateBoardInLists(
  queryClient: QueryClient,
  board: BoardResponse,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: boardKeys.lists() });

  for (const entry of queries) {
    const key = entry.queryKey;
    queryClient.setQueryData<BoardListCache>(key, (old) => {
      if (!old) return old;

      const matchesFilter = listMatchesNameFilter(key, board);
      const currentIndex = old.data.findIndex((b) => b.id === board.id);
      const current = currentIndex >= 0 ? old.data[currentIndex] : undefined;

      if (currentIndex < 0) {
        return old;
      }

      if (!matchesFilter) {
        const next = old.data.filter((b) => b.id !== board.id);
        if (next.length === old.data.length) return old;
        return {
          ...old,
          data: next,
          pagination: bumpPaginationTotal(old.pagination, -1),
        };
      }

      const next = [...old.data];
      next[currentIndex] = { ...current, ...board };
      return { ...old, data: next };
    });
  }
}

function removeBoardFromLists(queryClient: QueryClient, boardId: string): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: boardKeys.lists() });

  for (const entry of queries) {
    queryClient.setQueryData<BoardListCache>(entry.queryKey, (old) => {
      if (!old) return old;
      const before = old.data.length;
      const next = old.data.filter((b) => b.id !== boardId);
      if (next.length === before) return old;
      return {
        ...old,
        data: next,
        pagination: bumpPaginationTotal(
          old.pagination,
          -(before - next.length),
        ),
      };
    });
  }
}

function mutateMembersCache(
  queryClient: QueryClient,
  boardId: string,
  mutate: (current: BoardMemberUser[]) => BoardMemberUser[],
): void {
  const queryKey = boardKeys.members(boardId);
  const old = queryClient.getQueryData<BoardMembersCache>(queryKey);

  if (old === undefined) {
    void queryClient.invalidateQueries({ queryKey });
    return;
  }

  queryClient.setQueryData<BoardMembersCache>(queryKey, (currentOld) => {
    const current = currentOld ?? [];
    const next = mutate(current);
    // Nếu mutate trả về cùng reference (no-op) thì giữ cache nguyên.
    return next === current ? currentOld : next;
  });
}

export function applyBoardCreated(
  queryClient: QueryClient,
  projectId: string,
  board: BoardResponse,
): void {
  if (!board?.id || !board?.projectId) {
    logInvalid("applyBoardCreated", board);
    return;
  }
  if (board.projectId !== projectId) {
    logInvalid("applyBoardCreated projectId mismatch", {
      payloadProjectId: projectId,
      boardProjectId: board.projectId,
    });
    return;
  }
  if (!isActiveBoard(board)) return;

  queryClient.setQueryData<BoardDetailCache>(
    boardKeys.detail(board.id),
    (old) =>
      old
        ? { ...old, data: { ...old.data, ...board } }
        : ({ success: true, data: board } as ApiResponse<BoardResponse>),
  );
  insertBoardToFirstList(queryClient, board);
}

export function applyBoardUpdated(
  queryClient: QueryClient,
  projectId: string,
  board: BoardResponse,
): void {
  if (!board?.id || !board?.projectId) {
    logInvalid("applyBoardUpdated", board);
    return;
  }
  if (board.projectId !== projectId) {
    logInvalid("applyBoardUpdated projectId mismatch", {
      payloadProjectId: projectId,
      boardProjectId: board.projectId,
    });
    return;
  }

  if (!isActiveBoard(board)) {
    applyBoardDeleted(queryClient, projectId, board.id);
    return;
  }

  queryClient.setQueryData<BoardDetailCache>(
    boardKeys.detail(board.id),
    (old) =>
      old
        ? { ...old, data: { ...old.data, ...board } }
        : ({ success: true, data: board } as ApiResponse<BoardResponse>),
  );
  updateBoardInLists(queryClient, board);
}

export function applyBoardDeleted(
  queryClient: QueryClient,
  projectId: string,
  boardId: string,
): void {
  if (!boardId || !projectId) return;
  removeBoardFromLists(queryClient, boardId);
  queryClient.removeQueries({ queryKey: boardKeys.detail(boardId) });
  queryClient.removeQueries({ queryKey: boardKeys.members(boardId) });
  queryClient.removeQueries({
    queryKey: boardKeys.membersByProject(projectId),
  });

  // Board có thể đang mở — invalidate list cache của board để buộc refetch
  // khi user quay lại. Lưu lại listId thuộc board để dùng cho bước dưới.
  const boardListIds = new Set<string>();
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: listKeys.boardPrefix(boardId) })) {
    const data = query.state.data as
      | { data?: Array<{ id: string }> }
      | undefined;
    for (const list of data?.data ?? []) boardListIds.add(list.id);
    void queryClient.invalidateQueries({ queryKey: query.queryKey });
  }

  // Invalidate task list cho các list thuộc board. Key shape:
  //   ["tasks", "list", listId, filters?]
  for (const query of queryClient
    .getQueryCache()
    .findAll({ queryKey: taskKeys.lists() })) {
    const listId = query.queryKey[2];
    if (typeof listId !== "string" || !boardListIds.has(listId)) continue;
    void queryClient.invalidateQueries({ queryKey: query.queryKey });
  }
}

export function applyBoardMemberAdded(
  queryClient: QueryClient,
  boardId: string,
  member: BoardMemberUser,
): void {
  if (!boardId || !member?.boardMemberId || !member?.id || !member?.roleId) {
    logInvalid("applyBoardMemberAdded", { boardId, member });
    return;
  }
  mutateMembersCache(queryClient, boardId, (current) => {
    const index = current.findIndex(
      (m) => m.boardMemberId === member.boardMemberId,
    );
    if (index >= 0) {
      const next = [...current];
      next[index] = { ...next[index], ...member };
      return next;
    }
    return [...current, member];
  });
}

export function applyBoardMemberRemoved(
  queryClient: QueryClient,
  boardId: string,
  memberId: string,
  _userId: string,
): void {
  if (!boardId || !memberId) return;
  mutateMembersCache(queryClient, boardId, (current) => {
    const next = current.filter((m) => m.boardMemberId !== memberId);
    return next.length === current.length ? current : next;
  });
  // userId hiện không dùng trực tiếp trong reducer nhưng giữ trong chữ ký
  // để khớp với event payload — phase sau có thể dùng để invalidate
  // cache assignee liên quan tới user bị xoá.
  void _userId;
}

export function applyBoardMemberRoleUpdated(
  queryClient: QueryClient,
  boardId: string,
  member: BoardMemberUser,
): void {
  if (!boardId || !member?.boardMemberId || !member?.id || !member?.roleId) {
    logInvalid("applyBoardMemberRoleUpdated", { boardId, member });
    return;
  }
  mutateMembersCache(queryClient, boardId, (current) => {
    const index = current.findIndex(
      (m) => m.boardMemberId === member.boardMemberId,
    );
    if (index < 0) return current;
    const next = [...current];
    next[index] = { ...next[index], ...member };
    return next;
  });
}
