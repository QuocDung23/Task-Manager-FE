import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { authStorage } from "../storage/auth-storage";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";
import { getApiErrorMessage } from "@/lib/error-message";
import { APP_ROUTES } from "../../../router/constans";

export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data, variables) => {
      if (data.verify === false) {
        authStorage.clearToken();
        toast.warning("Please verify your account");
        navigate(
          `${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(variables.email)}&flow=verify-account`,
        );
      } else {
        authStorage.setToken(data.accessToken);
        toast.success("Login successful");
        navigate(APP_ROUTES.MAIN, { replace: true });
        queryClient.invalidateQueries({ queryKey: ["current-user"] });
      }
    },
    onError: (error: ApiError) => {
      toast.error(
        getApiErrorMessage(error, "Login failed. Please try again."),
      );
    },
  });
};
