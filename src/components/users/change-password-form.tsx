import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import { PasswordField } from "./password-field";
import { useChangePasswordForm } from "@/hooks/users/useChangePasswordForm";

interface ChangePasswordFormProps {
  onCancel: () => void;
}

export function ChangePasswordForm({ onCancel }: ChangePasswordFormProps) {
  const {
    fieldErrors,
    formRef,
    isPending,
    handleSubmit,
    clearFieldError,
    resetForm,
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    minPasswordLength,
    maxPasswordLength,
  } = useChangePasswordForm();

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="grid gap-5">
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Change password</h3>
        <p className="text-xs text-muted-foreground">
          Use {minPasswordLength}-{maxPasswordLength} characters. Your new password must be
          different from your current one.
        </p>
      </div>

      <FieldError errors={fieldErrors.form ? [{ message: fieldErrors.form }] : undefined} />

      <PasswordField
        id="currentPassword"
        label="Current password"
        placeholder="Enter your current password"
        autoComplete="current-password"
        isVisible={showCurrentPassword}
        onVisibilityToggle={() => setShowCurrentPassword((previous) => !previous)}
        onInputChange={() => clearFieldError("currentPassword")}
        minLength={minPasswordLength}
        maxLength={maxPasswordLength}
        error={fieldErrors.currentPassword}
        isAutoFocus
      />

      <PasswordField
        id="newPassword"
        label="New password"
        placeholder="Enter a new password"
        autoComplete="new-password"
        isVisible={showNewPassword}
        onVisibilityToggle={() => setShowNewPassword((previous) => !previous)}
        onInputChange={() => clearFieldError("newPassword")}
        minLength={minPasswordLength}
        maxLength={maxPasswordLength}
        error={fieldErrors.newPassword}
      />

      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        placeholder="Re-enter the new password"
        autoComplete="new-password"
        isVisible={showConfirmPassword}
        onVisibilityToggle={() => setShowConfirmPassword((previous) => !previous)}
        onInputChange={() => clearFieldError("confirmPassword")}
        minLength={minPasswordLength}
        maxLength={maxPasswordLength}
        error={fieldErrors.confirmPassword}
      />

      <div className="flex justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            onCancel();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
