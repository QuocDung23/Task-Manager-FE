import { useClearOnLocaleChange } from "@/services/i18n";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

import { useRegister } from "@/features/auth/hooks/useRegister";
import type { RegisterRequest } from "@/features/auth/types";
import type { AuthFieldKey } from "@/lib/auth-error-message";
import { useT } from "@/services/i18n";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

type FormRefs = Partial<Record<AuthFieldKey, HTMLInputElement | null>>;

const MIN_PASSWORD_LENGTH = 6;

const FIELD_INPUT_ID: Record<Exclude<AuthFieldKey, "otp">, string> = {
  email: "email",
  password: "password",
  confirmPassword: "confirm-password",
  name: "name",
};

/**
 * Order used to focus the first errored field. Email first because it's the
 * most common register failure (409 conflict).
 */
const FOCUS_ORDER: Array<Exclude<AuthFieldKey, "otp">> = [
  "email",
  "name",
  "password",
  "confirmPassword",
];

export function ViewRegister() {
  const t = useT();
  // The hook fires its own toast; the view only mirrors errors into per-field
  // state so the inputs get red borders.
  const registerSubmit = useRegister({
    onAuthError: ({ result }) => {
      setFieldErrors((prev) => {
        // Drop any stale 'form' error so per-field errors win when present.
        const base: FieldErrors = { ...prev, form: undefined };

        if (result.fieldErrors) {
          // 422 case: clear unrelated fields, set BE-detected fields only.
          const cleared: FieldErrors = {
            name: undefined,
            email: undefined,
            password: undefined,
            confirmPassword: undefined,
          };
          return { ...cleared, ...result.fieldErrors, form: undefined };
        }

        if (result.field) {
          return { ...base, [result.field]: result.message };
        }

        return { ...base, form: result.message };
      });

      // Schedule focus to the first errored input on next paint, so the DOM
      // has applied the `aria-invalid` and the screen reader will announce it.
      requestAnimationFrame(() => {
        const targets = result.fieldErrors
          ? FOCUS_ORDER.filter((key) => result.fieldErrors?.[key])
          : result.field
            ? [result.field as Exclude<AuthFieldKey, "otp">]
            : [];

        const firstKey = targets[0];
        if (!firstKey) return;
        const element = inputRefs.current[firstKey];
        element?.focus();
      });
    },
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  useClearOnLocaleChange(() => setFieldErrors({}));

  // Build one ref-setter per field. We use a fresh `useRef` per field and
  // stash it into the shared `inputRefs` map inside `useEffect` — this keeps
  // the rule-of-hooks happy and lets ESLint's `react-hooks/immutability`
  // rule pass without mutating `inputRefs.current` inside JSX.
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const inputRefs = useRef<FormRefs>({});
  useEffect(() => {
    inputRefs.current = {
      name: nameRef.current,
      email: emailRef.current,
      password: passwordRef.current,
      confirmPassword: confirmPasswordRef.current,
    };
  });

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload: RegisterRequest = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirm-password") ?? ""),
    };

    // Client-side validation: clearer feedback than waiting for BE.
    const nextErrors: FieldErrors = {};
    if (!payload.name) {
      nextErrors.name = t("auth.nameRequired");
    } else if (payload.name.length < 2) {
      nextErrors.name = t("auth.nameTooShort");
    }
    if (!payload.email) {
      nextErrors.email = t("auth.emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      nextErrors.email = t("auth.emailInvalid");
    }
    if (!payload.password) {
      nextErrors.password = t("auth.passwordChoose");
    } else if (payload.password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = t("auth.passwordTooShort", { count: MIN_PASSWORD_LENGTH });
    }
    if (!payload.confirmPassword) {
      nextErrors.confirmPassword = t("auth.confirmRequired");
    } else if (payload.password !== payload.confirmPassword) {
      nextErrors.confirmPassword = t("auth.passwordMismatch");
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error(
        nextErrors.name ??
          nextErrors.email ??
          nextErrors.password ??
          nextErrors.confirmPassword ??
          "",
      );
      // Focus first invalid field (client-side).
      requestAnimationFrame(() => {
        const firstInvalid = FOCUS_ORDER.find((key) => nextErrors[key]);
        if (!firstInvalid) return;
        inputRefs.current[firstInvalid]?.focus();
      });
      return;
    }

    registerSubmit.mutate(payload, {
      onSuccess: () => {
        setFieldErrors({});
      },
    });
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.registerTitle")}</CardTitle>
        <CardDescription>
          {t("auth.registerDescription")}
        </CardDescription>
        <CardAction>
          <Button variant="link" asChild>
            <Link to="/login">{t("auth.signIn")}</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={onSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">{t("common.name")}</Label>
              <Input
                id={FIELD_INPUT_ID.name}
                name="name"
                type="text"
                placeholder={t("auth.enterName")}
                required
                aria-invalid={Boolean(fieldErrors.name)}
                autoComplete="name"
                ref={nameRef}
                onChange={() => clearFieldError("name")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("common.email")}</Label>
              <Input
                id={FIELD_INPUT_ID.email}
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
                ref={emailRef}
                onChange={() => clearFieldError("email")}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">{t("common.password")}</Label>
              </div>
              <Input
                id={FIELD_INPUT_ID.password}
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete="new-password"
                ref={passwordRef}
                onChange={() => clearFieldError("password")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">{t("common.confirmPassword")}</Label>
              <Input
                id={FIELD_INPUT_ID.confirmPassword}
                name="confirm-password"
                type="password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                autoComplete="new-password"
                ref={confirmPasswordRef}
                onChange={() => clearFieldError("confirmPassword")}
              />
            </div>
          </div>
          <CardFooter className="flex-col gap-2 mt-6 px-0">
            <Button
              type="submit"
              className="w-full"
              disabled={registerSubmit.isPending}
            >
              {registerSubmit.isPending ? t("auth.creatingAccount") : t("auth.signUp")}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
