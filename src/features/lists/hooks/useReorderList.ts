import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ApiResponse,
  ListResponse,
  ReorderListsRequest,
} from "../types";
import { listApi } from "../api/list-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { applyCanonicalListBoardSnapshot } from "../utils/list-cache";
import { listKeys } from "../utils/list-query-keys";

export const useReorderList = (boardId: string) => {
  const queryClient = useQueryClient();
  return useMutation<
    ApiResponse<ListResponse[]>,
    ApiError,
    ReorderListsRequest
  >({
    mutationFn: (data) => listApi.reorder(boardId, data),
    onSuccess: (response) => {
      const data = Array.isArray(response?.data) ? response.data : null;
      if (data && data.length > 0) {
        // Server trả canonical snapshot sort theo order; set trực tiếp
        // vào cache để tránh flash phải refetch.
        const result = applyCanonicalListBoardSnapshot(
          queryClient,
          boardId,
          data,
        );
        if (result === "invalidated") {
          void queryClient.invalidateQueries({
            queryKey: listKeys.boardPrefix(boardId),
          });
        }
      } else {
        void queryClient.invalidateQueries({
          queryKey: listKeys.boardPrefix(boardId),
        });
      }
    },
    onError: (error) => {
      // 400/403/404: invalidate để refetch canonical state thật từ server.
      const status = error.response?.status;
      if (status === 400 || status === 403 || status === 404) {
        void queryClient.invalidateQueries({
          queryKey: listKeys.boardPrefix(boardId),
        });
      }
      toast.error(error.response?.data?.message || "Reorder List Failed");
    },
  });
};

export { useReorderList as useReoderList };
