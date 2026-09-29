import { useMutation } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import type { ChangePasswordPayload } from "../types";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => userApi.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Change password failed");
    },
  });
};
