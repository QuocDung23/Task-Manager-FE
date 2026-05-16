import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth-api";
import { authStorage } from "../storage/auth-storage";
import { toast } from "sonner";
import { APP_ROUTES } from "@/router/constans";
import { useQueryClient } from "@tanstack/react-query";

export const useVerifyAccount = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyAccount,
    onSuccess: (data) => {
      authStorage.setToken(data.accessToken);
      toast.success("Account verified successfully! Welcome aboard.");
      navigate(APP_ROUTES.MAIN, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "Verification failed. Please check your OTP and try again.",
      );
    },
  });
};
