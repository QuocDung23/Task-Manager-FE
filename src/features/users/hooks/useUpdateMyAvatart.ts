import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import { toast } from "sonner";
import type { ApiResponse, UpdateAvatarPayload, UserResponse } from "../types";

type CurrentUserCache = ApiResponse<UserResponse> | undefined;

export const useUpdateMyAvatar = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file }: UpdateAvatarPayload) => userApi.updateMyAvatar(file),
    onMutate: async ({ previewUrl }) => {
      await queryClient.cancelQueries({ queryKey: ["current-user"] });
      const previousUser = queryClient.getQueryData(["current-user"]);
      if (previewUrl) {
        queryClient.setQueryData<CurrentUserCache>(
          ["current-user"],
          (old) => {
            if (!old?.data) return old;
            return {
              ...old,
              data: { ...old.data, avatar: previewUrl },
            };
          },
        );
      }
      return { previousUser };
    },
    onSuccess: (response) => {
      queryClient.setQueryData<CurrentUserCache>(
        ["current-user"],
        (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: { ...old.data, avatar: response.data.avatar },
          };
        },
      );
      toast.success("Update Avatar Successfully");
    },
    onError: (_error, _variables, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(["current-user"], context.previousUser);
      }
      toast.error("Update Avatar Failed");
    },
  });
};
