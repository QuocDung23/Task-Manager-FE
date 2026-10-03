import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useMutation } from "@tanstack/react-query";
import { userApi } from "../api/user-api";
import type { ChangePasswordPayload } from "../types";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => userApi.changePassword(data),
    onSuccess: () => {
      toast.success(t("toast.passwordChanged"));
    },
    onError: (error: ApiError) => {
      toast.error(getApiErrorMessage(error, "Change password failed"));
    },
  });
};
