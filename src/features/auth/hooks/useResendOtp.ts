import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import { toast } from "sonner";
import type { ApiError } from "@/lib/api-error";

export const useResendOtp = (email: string) => {
  return useMutation({
    mutationFn: () => authApi.sendOtp({ email }),
    onSuccess: () => {
      toast.success("A new OTP has been sent to your email.");
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Failed to resend OTP.");
    },
  });
};
