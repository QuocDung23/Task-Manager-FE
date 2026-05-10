import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { authStorage } from "../storage/auth-storage";
import { toast } from "sonner";
import type { AxiosError } from "axios";
import { APP_ROUTES } from "../../../router/constans";

type ApiError = {
  message?: string;
};

export const useLogin = () => {
  const navigate = useNavigate();
  //   const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      authStorage.setToken(data.accessToken);
      toast.success("Dang nhap thanh cong");
      //   queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate(APP_ROUTES.MAIN, { replace: true });
    },
    onError: (error: AxiosError<ApiError>) => {
      const message = error.response?.data?.message ?? "Dang nhap that bai";
      toast.error(message);
    },
  });
};
