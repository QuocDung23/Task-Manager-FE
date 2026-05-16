import type { FormEvent } from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";

const MIN_PASSWORD_LENGTH = 6;

export function useResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const resetPassword = useResetPassword();

  const email = searchParams.get("email") ?? "";
  const otp = searchParams.get("otp") ?? "";
  const hasValidResetParams = Boolean(email && otp);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
      return;
    }

    if (!hasValidResetParams) {
      toast.error("Invalid request. Please start the process again.");
      return;
    }

    resetPassword.mutate({
      email,
      otp,
      newPassword,
      confirmPassword,
    });
  };

  return {
    email,
    hasValidResetParams,
    isPending: resetPassword.isPending,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    onSubmit,
    setShowPassword,
    showPassword,
  };
}
