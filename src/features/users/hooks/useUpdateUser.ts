import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
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
      toast.success(t("toast.updated"));
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Update Failed"));
    },
  });
};
