import { useEffect, useRef, useState, type FormEvent } from "react";
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

import type { LoginRequest } from "../../features/auth/types";
import { APP_ROUTES } from "../../router/constans";
import { useLogin } from "../../features/auth/hooks/useLogin";

type FieldErrors = {
  email?: string;
  password?: string;
  form?: string;
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 60_000;
const LOCKOUT_STATUSES = new Set([400, 401, 404]);

export function ViewLogin() {
  const submitLogin = useLogin({
    onAuthError: ({ result, status }) => {
      const isLockoutStatus =
        typeof status === "number" && LOCKOUT_STATUSES.has(status);
      if (isLockoutStatus) {
        bumpAttempt();
      }
      setFieldErrors((prev) => {
        const next: FieldErrors = { ...prev, form: undefined };
        if (result.fieldErrors) {
          const cleared: FieldErrors = {
            email: undefined,
            password: undefined,
            form: undefined,
          };
          return { ...cleared, ...result.fieldErrors, form: undefined };
        }
        if (result.field === "email") {
          next.email = result.message;
        } else if (result.field === "password") {
          next.password = result.message;
        } else {
          next.form = result.message;
        }
        return next;
      });
    },
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attemptCount, setAttemptCount] = useState(0);
  // Holds a timer that resets the lockout after `LOCKOUT_WINDOW_MS`.
  const lockoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
    };
  }, []);

  const clearFieldError = (field: keyof FieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      return { ...prev, [field]: undefined };
    });
  };

  const bumpAttempt = () => {
    setAttemptCount((count) => {
      const next = count + 1;
      if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
      lockoutTimerRef.current = setTimeout(() => {
        setAttemptCount(0);
      }, LOCKOUT_WINDOW_MS);
      return next;
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLockedOut) return;

    const formData = new FormData(event.currentTarget);

    const payload: LoginRequest = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    // Client-side validation: surface inline errors rather than waiting for BE.
    const nextErrors: FieldErrors = {};
    if (!payload.email) {
      nextErrors.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }
    if (!payload.password) {
      nextErrors.password = "Please enter your password.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      toast.error(nextErrors.email ?? nextErrors.password ?? "");
      return;
    }

    submitLogin.mutate(payload, {
      onSuccess: () => {
        setFieldErrors({});
        setAttemptCount(0);
        if (lockoutTimerRef.current) clearTimeout(lockoutTimerRef.current);
      },
    });
  };

  const isLockedOut = attemptCount >= MAX_ATTEMPTS;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Log in to your account</CardTitle>
        <CardDescription>
          Enter your email and password to continue.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={onSubmit} noValidate>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                required
                aria-invalid={Boolean(fieldErrors.email)}
                autoComplete="email"
                onChange={() => clearFieldError("email")}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                aria-invalid={Boolean(fieldErrors.password)}
                autoComplete="current-password"
                onChange={() => clearFieldError("password")}
              />
              <div className="flex items-center">
                <Link
                  to={APP_ROUTES.FORGOT_PASSWORD}
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
                <CardAction>
                  <Button variant="link" asChild>
                    <Link to={APP_ROUTES.REGISTER}>Sign up</Link>
                  </Button>
                </CardAction>
              </div>
            </div>
            {isLockedOut ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium leading-snug text-destructive"
              >
                Too many failed attempts. The form is temporarily paused —
                please wait a minute before trying again, or{" "}
                <Link
                  to={APP_ROUTES.FORGOT_PASSWORD}
                  className="underline underline-offset-2"
                >
                  reset your password
                </Link>
                .
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          type="submit"
          form="login-form"
          className="w-full"
          disabled={submitLogin.isPending || isLockedOut}
        >
          {submitLogin.isPending ? "Signing in..." : "Sign in"}
        </Button>
        <Button variant="outline" className="w-full" type="button" disabled>
          Sign in with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
