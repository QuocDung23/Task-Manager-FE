import { useMutation } from "@tanstack/react-query";
import type { VerifyOtpRequest } from "../types";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";

export const useVerifyOtp = () => {
  return useMutation({
    mutationFn: (data: VerifyOtpRequest) => authApi.verifyOtp(data),
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          "The OTP code is invalid or has expired!",
      );
    },
  });
};
