import { useClearOnLocaleChange } from "@/services/i18n";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { useT } from "@/services/i18n";

const MIN_PASSWORD_LENGTH = 6;

export type ResetPasswordFieldErrors = {
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
};

export function useResetPasswordForm() {
  const t = useT();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
  useClearOnLocaleChange(() => setFieldErrors({}));
  // The hook handles the toast; the form only mirrors errors into per-field
  // state.
  const resetPassword = useResetPassword({
    onAuthError: ({ result }) => {
      setFieldErrors((prev) => {
        const next: ResetPasswordFieldErrors = { ...prev, form: undefined };
        if (result.field === "password") {
          next.newPassword = result.message;
        } else if (result.field === "confirmPassword") {
          next.confirmPassword = result.message;
        } else {
          next.form = result.message;
        }
        return next;
      });
    },
  });

  const email = searchParams.get("email") ?? "";
  const otp = searchParams.get("otp") ?? "";
  const hasValidResetParams = Boolean(email && otp);

  const clearFieldError = (field: keyof ResetPasswordFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const nextErrors: ResetPasswordFieldErrors = {};
    if (!newPassword) {
      nextErrors.newPassword = t("auth.newPasswordRequired");
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = t("auth.passwordTooShort", { count: MIN_PASSWORD_LENGTH });
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = t("auth.confirmRequired");
    } else if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = t("auth.passwordMismatch");
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error(
        nextErrors.newPassword ?? nextErrors.confirmPassword ?? "",
      );
      return;
    }

    if (!hasValidResetParams) {
      setFieldErrors({
        form: t("auth.resetInvalid"),
      });
      toast.error(t("auth.resetInvalid"));
      return;
    }

    setFieldErrors({});
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
    fieldErrors,
    onSubmit,
    setShowPassword,
    showPassword,
    clearFieldError,
  };
}
