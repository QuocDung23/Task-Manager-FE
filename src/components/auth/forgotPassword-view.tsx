import { Link } from "react-router-dom";
import type { FormEvent } from "react";
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
import { useSendOtp } from "../../features/auth/hooks/useSendOtp";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

export function ViewForgotPassword() {
  const submitForgotPassword = useSendOtp();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    submitForgotPassword.mutate({ email });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Forgot password?</CardTitle>
        <CardDescription>
          No worries, we'll send you reset instructions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="forgot-password-form" onSubmit={onSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
              />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button
          type="submit"
          form="forgot-password-form"
          className="w-full"
          disabled={submitForgotPassword.isPending}
        >
          {submitForgotPassword.isPending ? "Sending..." : "Reset Password"}
        </Button>
        <div className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link
            to={APP_ROUTES.LOGIN}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
