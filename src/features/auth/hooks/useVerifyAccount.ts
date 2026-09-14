import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { authStorage } from "../storage/auth-storage";
import { toast } from "sonner";
import { APP_ROUTES } from "@/router/constans";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";
import type { Verify, VerifyAccountResponse } from "../types";

export type VerifyAccountAuthErrorContext = {
  result: AuthErrorResult;
  payload: Verify;
  status?: number;
};

export function useVerifyAccount(options?: {
  onAuthError?: (context: VerifyAccountAuthErrorContext) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onAuthError = options?.onAuthError;

  return useMutation<VerifyAccountResponse, unknown, Verify>({
    mutationFn: authApi.verifyAccount,
    onSuccess: (data) => {
      authStorage.setToken(data.accessToken);
      toast.success("Account verified successfully! Welcome aboard.");
      navigate(APP_ROUTES.MAIN, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error: unknown, variables) => {
      const apiError = error as { response?: { status?: number } } | undefined;
      const status = apiError?.response?.status;
      const result = getAuthErrorMessage(error, "verifyAccount");
      toast.error(result.message);
      onAuthError?.({ result, payload: variables, status });
    },
  });
}
