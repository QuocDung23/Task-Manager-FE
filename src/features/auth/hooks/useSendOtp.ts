import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth-api";
import type { SendOtpRequest } from "../types";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { ApiError } from "@/lib/api-error";

export function useSendOtp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: SendOtpRequest) => authApi.sendOtp(data),
    onSuccess: (_, variables) => {
      toast.success("OTP sent! Please check your email.");
      navigate(`/verify-otp?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error: ApiError) => {
      toast.error(error.response?.data?.message || "Email does not exist!");
    },
  });
}
