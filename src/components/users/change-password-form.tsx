import { useT } from "@/services/i18n";
import { TranslateText } from "@/services/i18n";
import { Button } from "../ui/button";
import { FieldError } from "../ui/field";
import { PasswordField } from "./password-field";
import { useChangePasswordForm } from "@/hooks/users/useChangePasswordForm";

interface ChangePasswordFormProps {
  onCancel: () => void;
}

export function ChangePasswordForm({ onCancel }: ChangePasswordFormProps) {
  const t = useT();
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
        <h3 className="text-sm font-semibold text-foreground"><TranslateText id="profile.changePassword" /></h3>
        <p className="text-xs text-muted-foreground">
          {t("profile.passwordHint", { min: minPasswordLength, max: maxPasswordLength })}
        </p>
      </div>

      <FieldError errors={fieldErrors.form ? [{ message: fieldErrors.form }] : undefined} />

      <PasswordField
        id="currentPassword"
        label={t("profile.currentPassword")}
        placeholder={t("profile.currentPasswordPlaceholder")}
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
        label={t("profile.newPassword")}
        placeholder={t("auth.enterNewPassword")}
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
        label={t("profile.confirmNewPassword")}
        placeholder={t("auth.reenterNewPassword")}
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
          <TranslateText id="common.cancel" />
        </Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("profile.updating") : t("profile.updatePassword")}
        </Button>
      </div>
    </form>
  );
}
