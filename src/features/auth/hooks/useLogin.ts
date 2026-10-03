import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { authStorage } from "../storage/auth-storage";
import { toast } from "sonner";
import { APP_ROUTES } from "../../../router/constans";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";
import type { LoginRequest, LoginResponse } from "../types";
import type { ApiError } from "@/lib/api-error";
import { t } from "@/services/i18n";

export type LoginAuthErrorContext = {
  result: AuthErrorResult;
  payload: LoginRequest;
  status?: number;
};

export function useLogin(options?: {
  onAuthError?: (context: LoginAuthErrorContext) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onAuthError = options?.onAuthError;

  return useMutation<LoginResponse, unknown, LoginRequest>({
    mutationFn: authApi.login,
    onSuccess: (data, variables) => {
      if (data.verify === false) {
        authStorage.clearToken();
        toast.warning(t("auth.verifyReminder"));
        navigate(
          `${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(variables.email)}&flow=verify-account`,
        );
      } else {
        authStorage.setToken(data.accessToken);
        toast.success(t("auth.loginSuccess"));
        navigate(APP_ROUTES.MAIN, { replace: true });
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
      }
    },
    onError: (error: unknown, variables) => {
      const result = getAuthErrorMessage(error, "login");
      const status = (error as ApiError | undefined)?.response?.status;
      toast.error(result.message);
      onAuthError?.({ result, payload: variables, status });
    },
  });
}
