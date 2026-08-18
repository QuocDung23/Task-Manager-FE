import { useQuery } from "@tanstack/react-query";
import type { ListStatus } from "../types";
import { listApi } from "../api/list-api";
import { listKeys } from "../utils/list-query-keys";

export type PaginatedListsResponse = {
  success: boolean;
  data: ListResponse[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
};

export const useLists = (
  boardId: string,
  page: number = 1,
  limit: number = 12,
  name?: string,
  status?: ListStatus,
) => {
  return useQuery<PaginatedListsResponse>({
    queryKey: listKeys.board(boardId, page, limit, name, status),
    queryFn: () => listApi.getAllByBoardId(boardId, page, limit, name, status),
  });
};
