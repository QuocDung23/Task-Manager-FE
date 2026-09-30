import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import type { SendOtpRequest, ForgotPasswordResponse } from "../types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";
import { t } from "@/services/i18n";

export type SendOtpAuthErrorContext = {
  result: AuthErrorResult;
  payload: SendOtpRequest;
};

export function useSendOtp(options?: {
  onAuthError?: (context: SendOtpAuthErrorContext) => void;
}) {
  const navigate = useNavigate();
  const onAuthError = options?.onAuthError;

  return useMutation<ForgotPasswordResponse, unknown, SendOtpRequest>({
    mutationFn: (data) => authApi.sendOtp(data),
    onSuccess: (_, variables) => {
      toast.success(t("auth.otpSent"));
      navigate(`/verify-otp?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: unknown, variables) => {
      const result = getAuthErrorMessage(error, "sendOtp");
      toast.error(result.message);
      onAuthError?.({ result, payload: variables });
    },
  });
}
