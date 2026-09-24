import { Link } from "react-router-dom";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { APP_ROUTES } from "../../router/constans";
import { useResetPasswordForm } from "@/hooks/auth/useResetPasswordForm";

export function ViewResetPassword() {
  const {
    hasValidResetParams,
    isPending,
    minPasswordLength,
    fieldErrors,
    onSubmit,
    setShowPassword,
    showPassword,
    clearFieldError,
  } = useResetPasswordForm();

  if (!hasValidResetParams) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Invalid request</CardTitle>
          <CardDescription>
            Please start the password reset process again.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to={APP_ROUTES.FORGOT_PASSWORD}>Go back</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a strong password you don't use anywhere else.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="reset-password-form" onSubmit={onSubmit} noValidate>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter a new password"
                  required
                  minLength={minPasswordLength}
                  aria-invalid={Boolean(fieldErrors.newPassword)}
                  autoComplete="new-password"
                  onChange={() => clearFieldError("newPassword")}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter the new password"
                  required
                  minLength={minPasswordLength}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  autoComplete="new-password"
                  onChange={() => clearFieldError("confirmPassword")}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 dark:border-zinc-700"
              />
              <Label htmlFor="showPassword" className="text-sm font-normal">
                Show password
              </Label>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button
          type="submit"
          form="reset-password-form"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Resetting..." : "Reset password"}
        </Button>
        <div className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            to={APP_ROUTES.LOGIN}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
