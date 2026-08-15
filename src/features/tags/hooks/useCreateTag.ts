import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import type { CreateTagRequest } from "../types";

export const useCreateTag = (boardId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagRequest) => tagApi.create(boardId!, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success("Tag created successfully");
      return response.data;
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to create tag";
      if (message.toLowerCase().includes("already exists")) {
        toast.error("A tag with this name already exists");
      } else if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error("You do not have permission to create tags");
      } else {
        toast.error(message);
      }
    },
  });
};
