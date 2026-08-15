import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { tagApi } from "../api/tag-api";
import { tagKeys } from "../utils/tag-query-keys";
import type { UpdateTagRequest, TagResponse } from "../types";

export const useUpdateTag = (boardId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: string; data: UpdateTagRequest }) =>
      tagApi.update(boardId!, tagId, data),
    onMutate: async ({ tagId, data }) => {
      await queryClient.cancelQueries({ queryKey: tagKeys.all });

      const previousTags = queryClient.getQueryData<TagResponse[]>(
        tagKeys.board(boardId ?? ""),
      );

      queryClient.setQueryData<TagResponse[]>(
        tagKeys.board(boardId ?? ""),
        (old) =>
          old?.map((tag) =>
            tag.id === tagId ? { ...tag, ...data } : tag,
          ),
      );

      return { previousTags };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast.success("Tag updated successfully");
    },
    onError: (error: unknown, _variables, context) => {
      if (context?.previousTags) {
        queryClient.setQueryData(
          tagKeys.board(boardId ?? ""),
          context.previousTags,
        );
      }
      const err = error as { response?: { data?: { message?: string } } };
      const message =
        err?.response?.data?.message ?? "Failed to update tag";
      if (message.toLowerCase().includes("already exists")) {
        toast.error("A tag with this name already exists");
      } else if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("forbidden")) {
        toast.error("You do not have permission to update tags");
      } else if (message.toLowerCase().includes("not found")) {
        toast.error("Tag not found");
      } else {
        toast.error(message);
      }
    },
  });
};
