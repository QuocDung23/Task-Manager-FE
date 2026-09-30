import { useMutation } from "@tanstack/react-query";
import type { ResetPasswordRequest, ResetPasswordResponse } from "../types";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";
import { t } from "@/services/i18n";

export type ResetPasswordAuthErrorContext = {
  result: AuthErrorResult;
  payload: ResetPasswordRequest;
};

export function useResetPassword(options?: {
  onAuthError?: (context: ResetPasswordAuthErrorContext) => void;
}) {
  const navigate = useNavigate();
  const onAuthError = options?.onAuthError;

  return useMutation<ResetPasswordResponse, unknown, ResetPasswordRequest>({
    mutationFn: (data) => authApi.resetPassword(data),
    onSuccess: () => {
      toast.success(t("auth.resetSuccess"));
      navigate("/login", { replace: true });
    },
    onError: (error: unknown, variables) => {
      const result = getAuthErrorMessage(error, "resetPassword");
      toast.error(result.message);
      onAuthError?.({ result, payload: variables });
    },
  });
}
