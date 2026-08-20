import type { QueryClient } from "@tanstack/react-query";
import type { ListApiResponse, ListResponse } from "../types";
import { listKeys } from "./list-query-keys";

type ListCache = ListApiResponse | undefined;

function updatePagination(
  pagination: ListApiResponse["pagination"],
  delta: number,
): ListApiResponse["pagination"] {
  if (!pagination || delta === 0) return pagination;
  const totalItems = Math.max(0, pagination.totalItems + delta);
  return {
    ...pagination,
    totalItems,
    totalPages: Math.max(
      1,
      Math.ceil(totalItems / Math.max(1, pagination.limit)),
    ),
  };
}

function matchesFilters(
  filters: { name?: string; status?: string },
  list: ListResponse,
): boolean {
  if (!filters) return true;
  if (filters.name && !list.name.toLowerCase().includes(filters.name.toLowerCase())) {
    return false;
  }
  if (filters.status && list.status !== filters.status) {
    return false;
  }
  return true;
}

function mergeListSnapshot(
  current: ListResponse | undefined,
  incoming: ListResponse,
): ListResponse {
  if (!current) return incoming;
  return { ...current, ...incoming };
}

function replaceOrInsertList(
  old: ListCache,
  incoming: ListResponse,
  filters: { name?: string; status?: string },
): ListCache {
  if (!old) return old;

  const currentIndex = old.data.findIndex((item) => item.id === incoming.id);
  const current = currentIndex >= 0 ? old.data[currentIndex] : undefined;
  const list = mergeListSnapshot(current, incoming);
  const shouldInclude = matchesFilters(filters, list);

  if (currentIndex < 0) {
    if (!shouldInclude) return old;
    const data = [...old.data, list].sort((left, right) => left.order - right.order);
    return { ...old, data, pagination: updatePagination(old.pagination, 1) };
  }

  if (!shouldInclude) {
    const data = old.data.filter((item) => item.id !== incoming.id);
    return {
      ...old,
      data,
      pagination: updatePagination(old.pagination, -1),
    };
  }

  const data = [...old.data.filter((item) => item.id !== incoming.id), list];
  data.sort((left, right) => left.order - right.order);
  return { ...old, data };
}

function extractFilters(key: readonly unknown[]): { name?: string; status?: string } {
  if (key.length < 5) return {};
  return {
    name: key[4] as string | undefined,
    status: key[5] as string | undefined,
  };
}

export function applyCreatedList(
  queryClient: QueryClient,
  list: ListResponse,
): void {
  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: listKeys.all });

  for (const entry of queries) {
    const key = entry.queryKey;
    // Only update queries that match the boardId
    if (key[0] !== "lists" || key.length < 2) continue;
    if (key[1] !== list.boardId) continue;

    const filters = extractFilters(key);
    queryClient.setQueryData<ListCache>(key, (old) =>
      replaceOrInsertList(old, list, filters),
    );
  }
}

/**
 * Replace an arbitrary subset of lists (matched by id) inside every cached
 * list query of the same board. Only the provided ids are touched; lists
 * missing from the snapshot are dropped. The result is sorted by `order`
 * so the UI can render straight from the cache.
 *
 * If the cache for a given query is too narrow to confidently replace (e.g.
 * paginated page that does not contain all snapshot ids), the caller can
 * pass `fallbackToInvalidate: true` to mark those queries as stale instead.
 */
export function applyCanonicalListBoardSnapshot(
  queryClient: QueryClient,
  boardId: string,
  snapshot: ListResponse[],
): "applied" | "invalidated" {
  const snapshotById = new Map(snapshot.map((list) => [list.id, list]));
  const snapshotIds = new Set(snapshotById.keys());

  const queries = queryClient
    .getQueryCache()
    .findAll({ queryKey: listKeys.boardPrefix(boardId) });

  if (queries.length === 0) return "applied";

  let invalidated = false;
  for (const entry of queries) {
    const key = entry.queryKey;
    queryClient.setQueryData<ListCache>(key, (old) => {
      if (!old) return old;

      // Pagination: nếu query có totalItems > old.data.length thì đây
      // là một trang cụ thể và ta không có view đầy đủ => invalidate.
      if (old.pagination && old.pagination.totalItems > old.data.length) {
        invalidated = true;
        return old;
      }

      const filters = extractFilters(key);
      const presentIds = new Set(old.data.map((list) => list.id));
      const locallyCovered = [...snapshotIds].every((id) => presentIds.has(id));

      if (!locallyCovered) {
        // Cache partial so cannot guarantee canonical replace without
        // missing entries from other pages; mark invalid.
        invalidated = true;
        return old;
      }

      const next = old.data
        .map((list) => snapshotById.get(list.id) ?? list)
        .filter(
          (list) => snapshotIds.has(list.id) && matchesFilters(filters, list),
        );
      next.sort((left, right) => left.order - right.order);
      return { ...old, data: next };
    });
  }

  return invalidated ? "invalidated" : "applied";
}
