import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import type { ForgotPasswordResponse } from "../types";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";

export type ResendOtpAuthErrorContext = {
  result: AuthErrorResult;
  payload: { email: string };
};

export function useResendOtp(
  email: string,
  options?: {
    onAuthError?: (context: ResendOtpAuthErrorContext) => void;
  },
) {
  const onAuthError = options?.onAuthError;

  return useMutation<ForgotPasswordResponse, unknown, void>({
    mutationFn: () => authApi.sendOtp({ email }),
    onSuccess: () => {
      toast.success("A new OTP has been sent to your email.");
    },
    onError: (error: unknown) => {
      // Re-send uses the same endpoint as `sendOtp`, so reuse that mapping.
      const result = getAuthErrorMessage(error, "sendOtp");
      toast.error(result.message);
      onAuthError?.({ result, payload: { email } });
    },
  });
}
