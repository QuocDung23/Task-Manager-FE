import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import { authStorage } from "../storage/auth-storage";
import type { ApiError } from "@/lib/api-error";
import { getApiErrorMessage } from "@/lib/error-message";
import { t } from "@/services/i18n";
import { useWorkspaceUiStore } from "@/store/workspace-ui-store";

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resetWorkspaceUi = useWorkspaceUiStore(
    (state) => state.resetWorkspaceUi,
  );

  return useMutation({
    mutationFn: authApi.logout,
    onError: (error: ApiError) => {
      toast.error(
        getApiErrorMessage(
          error,
          t("auth.logoutFailure"),
        ),
      );
    },
    onSettled: () => {
      authStorage.clearToken();
      queryClient.clear();
      resetWorkspaceUi();
      toast.success(t("auth.logoutSuccess"));
      navigate("/login", { replace: true });
    },
  });
};
