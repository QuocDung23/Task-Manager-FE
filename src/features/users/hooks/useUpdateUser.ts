import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import type { UserUpdatePayload } from "../types";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UserUpdatePayload) => userApi.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Update Successfully");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Update Failed");
    },
  });
};
