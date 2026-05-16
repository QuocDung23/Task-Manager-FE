import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { APP_ROUTES } from "@/router/constans";

type ApiError = {
  message: string;
};

export const useRegister = () => {
  const navigate = useNavigate();
  // const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (_, variables) => {
      toast.success("Register Successfully");
      // queryClient.invalidateQueries({ queryKey: ['me'] })
      navigate(
        `${APP_ROUTES.VERIFY_ACCOUNT}?email=${encodeURIComponent(variables.email)}&flow=verify-account`,
      );
    },
    onError: (error: AxiosError<ApiError>) => {
      console.error("[useRegister][error]", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      const message = error.response?.data?.message ?? "Dang ky that bai";
      toast.error(message);
    },
  });
};
