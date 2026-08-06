import { useQuery } from "@tanstack/react-query";
import { listApi } from "../api/list-api";
import type { ListResponse } from "../types";

export const useListById = (listId: string | undefined) => {
  return useQuery({
    queryKey: ["list", listId],
    queryFn: async () => {
      const res = await listApi.getById(listId as string);
      return res.data as ListResponse;
    },
    enabled: !!listId,
    staleTime: 60_000,
  });
};
