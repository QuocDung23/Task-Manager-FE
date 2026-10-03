import { useClearOnLocaleChange } from "@/services/i18n";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useChangePassword } from "@/features/users/hooks/useChangePassword";
import type { ChangePasswordPayload } from "@/features/users/types";
import type { ApiError } from "@/lib/api-error";
import { useT } from "@/services/i18n";
import { getApiErrorMessage } from "@/lib/error-message";

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 20;

export type ChangePasswordFieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  form?: string;
};

type ChangePasswordField = keyof ChangePasswordFieldErrors;

const mapErrorToField = (message: string): ChangePasswordField => {
  const normalized = message.toLowerCase().replace(/\s+/g, "");

  if (normalized.includes("confirmpassword")) return "confirmPassword";
  if (normalized.includes("newpassword")) return "newPassword";
  if (normalized.includes("currentpassword")) return "currentPassword";
  return "form";
};

export function useChangePasswordForm() {
  const t = useT();
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({});
  useClearOnLocaleChange(() => setFieldErrors({}));
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formRef = useRef<HTMLFormElement | null>(null);

  const changePassword = useChangePassword();

  const clearFieldError = (field: ChangePasswordField) => {
    setFieldErrors((previous) => {
      if (!previous[field]) return previous;
      return { ...previous, [field]: undefined };
    });
  };

  const resetForm = () => {
    formRef.current?.reset();
    setFieldErrors({});
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const validate = (
    payload: ChangePasswordPayload,
  ): ChangePasswordFieldErrors => {
    const nextErrors: ChangePasswordFieldErrors = {};
    const { currentPassword, newPassword, confirmPassword } = payload;

    if (!currentPassword) {
      nextErrors.currentPassword = t("passwordError.currentRequired");
    } else if (
      currentPassword.length < MIN_PASSWORD_LENGTH ||
      currentPassword.length > MAX_PASSWORD_LENGTH
    ) {
      nextErrors.currentPassword = t("passwordError.currentLength", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH });
    }

    if (!newPassword) {
      nextErrors.newPassword = t("passwordError.newRequired");
    } else if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      nextErrors.newPassword = t("passwordError.newLength", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH });
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword = t("passwordError.same");
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t("passwordError.confirmRequired");
    } else if (
      confirmPassword.length < MIN_PASSWORD_LENGTH ||
      confirmPassword.length > MAX_PASSWORD_LENGTH
    ) {
      nextErrors.confirmPassword = t("passwordError.newLength", { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH });
    } else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = t("passwordError.mismatch");
    }

    return nextErrors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload: ChangePasswordPayload = {
      currentPassword: String(formData.get("currentPassword") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
    };

    const nextErrors = validate(payload);

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error(
        nextErrors.currentPassword ??
          nextErrors.newPassword ??
          nextErrors.confirmPassword ??
          "",
      );
      return;
    }

    setFieldErrors({});

    changePassword.mutate(payload, {
      onSuccess: () => resetForm(),
      onError: (error: ApiError) => {
        const backendMessage = error.response?.data?.message || "";
        const field = mapErrorToField(backendMessage);
        setFieldErrors({ [field]: getApiErrorMessage(error, t("passwordError.changeFailed")) });
      },
    });
  };

  return {
    fieldErrors,
    formRef,
    isPending: changePassword.isPending,
    handleSubmit,
    clearFieldError,
    resetForm,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    maxPasswordLength: MAX_PASSWORD_LENGTH,
  };
}
