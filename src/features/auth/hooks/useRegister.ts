import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import { APP_ROUTES } from "@/router/constans";
import {
  getAuthErrorMessage,
  type AuthErrorResult,
} from "@/lib/auth-error-message";
import type { RegisterRequest, RegisterResponse } from "../types";

export type RegisterAuthErrorContext = {
  result: AuthErrorResult;
  payload: RegisterRequest;
};

export function useRegister(options?: {
  onAuthError?: (context: RegisterAuthErrorContext) => void;
}) {
  const navigate = useNavigate();
  const onAuthError = options?.onAuthError;

  return useMutation<RegisterResponse, unknown, RegisterRequest>({
    mutationFn: authApi.register,
    onSuccess: (_, variables) => {
      toast.success("Register Successfully");
      navigate(
        `${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(variables.email)}&flow=verify-account`,
      );
    },
    onError: (error: unknown, variables) => {
      const result = getAuthErrorMessage(error, "register");
      toast.error(result.message);
      onAuthError?.({ result, payload: variables });
    },
  });
}
