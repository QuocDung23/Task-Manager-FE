import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useChangePassword } from "@/features/users/hooks/useChangePassword";
import type { ChangePasswordPayload } from "@/features/users/types";
import type { ApiError } from "@/lib/api-error";

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
  const [fieldErrors, setFieldErrors] = useState<ChangePasswordFieldErrors>({});
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
      nextErrors.currentPassword = "Please enter your current password.";
    } else if (
      currentPassword.length < MIN_PASSWORD_LENGTH ||
      currentPassword.length > MAX_PASSWORD_LENGTH
    ) {
      nextErrors.currentPassword = `Current password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;
    }

    if (!newPassword) {
      nextErrors.newPassword = "Please enter your new password.";
    } else if (
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      nextErrors.newPassword = `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;
    } else if (newPassword === currentPassword) {
      nextErrors.newPassword =
        "New password must be different from your current password.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your new password.";
    } else if (
      confirmPassword.length < MIN_PASSWORD_LENGTH ||
      confirmPassword.length > MAX_PASSWORD_LENGTH
    ) {
      nextErrors.confirmPassword = `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`;
    } else if (newPassword && confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
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
        const message =
          error.response?.data?.message || "Change password failed";
        setFieldErrors({ [mapErrorToField(message)]: message });
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
