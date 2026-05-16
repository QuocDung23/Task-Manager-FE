import { useMutation } from "@tanstack/react-query";
import type { ResetPasswordRequest } from "../types";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export const useResetPassword = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: ResetPasswordRequest) => authApi.resetPassword(data),
    onSuccess: () => {
      toast.success("Password reset successfully");
      navigate("/login", { replace: true });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Password reset failed!");
    },
  });
};
