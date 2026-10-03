import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Verify, VerifyOtpResponse } from "../types";
import { authApi } from "../api/auth-api";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";

export type VerifyOtpAuthErrorContext = {
  result: AuthErrorResult;
  payload: Verify;
};

export function useVerifyOtp(options?: {
  onAuthError?: (context: VerifyOtpAuthErrorContext) => void;
}) {
  const onAuthError = options?.onAuthError;

  return useMutation<VerifyOtpResponse, unknown, Verify>({
    mutationFn: (data) => authApi.verifyOtp(data),
    onError: (error: unknown, variables) => {
      const result = getAuthErrorMessage(error, "verifyOtp");
      toast.error(result.message);
      onAuthError?.({ result, payload: variables });
    },
  });
}
