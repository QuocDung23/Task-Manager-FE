import { useClearOnLocaleChange } from "@/services/i18n";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";

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
import { toast } from "sonner";
import { APP_ROUTES } from "../../router/constans";
import { useSendOtp } from "../../features/auth/hooks/useSendOtp";
import { useT } from "@/services/i18n";

export function ViewForgotPassword() {
  const t = useT();
  const submitForgotPassword = useSendOtp({
    onAuthError: ({ result }) => {
      setEmailError(result.message);
    },
  });
  const [emailError, setEmailError] = useState<string | undefined>();
  useClearOnLocaleChange(() => setEmailError(undefined));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("email") ?? "").trim();

    if (!nextEmail) {
      const message = t("auth.emailRequired");
      setEmailError(message);
      toast.error(message);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      const message = t("auth.emailInvalid");
      setEmailError(message);
      toast.error(message);
      return;
    }

    setEmailError(undefined);
    submitForgotPassword.mutate({ email: nextEmail });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>{t("auth.forgotTitle")}</CardTitle>
        <CardDescription>
          {t("auth.forgotDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="forgot-password-form" onSubmit={onSubmit} noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">{t("common.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="m@example.com"
              required
              aria-invalid={Boolean(emailError)}
              autoComplete="email"
              onChange={() => setEmailError(undefined)}
            />
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
          {submitForgotPassword.isPending ? t("common.sending") : t("common.resetPassword")}
        </Button>
        <div className="text-sm text-muted-foreground">
          {t("auth.rememberPassword")}{" "}
          <Link
            to={APP_ROUTES.LOGIN}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("auth.backToSignIn")}
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
