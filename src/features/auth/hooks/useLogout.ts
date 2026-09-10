import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import { authStorage } from "../storage/auth-storage";
import type { ApiError } from "@/lib/api-error";
import { getApiErrorMessage } from "@/lib/error-message";

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onError: (error: ApiError) => {
      toast.error(
        getApiErrorMessage(
          error,
          "Logout failed. Local session has been cleared.",
        ),
      );
    },
    onSettled: () => {
      authStorage.clearToken();
      queryClient.clear();
      toast.success("Logout Successfully");
      navigate("/login", { replace: true });
    },
  });
};
