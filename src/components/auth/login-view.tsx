import type { FormEvent } from "react";
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
import type { LoginRequest } from "../../features/auth/types";
import { APP_ROUTES } from "../../router/constans";
import { useLogin } from "../../features/auth/hooks/useLogin";
import { toast } from "sonner";

export function ViewLogin() {
  const submitLogin = useLogin();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload: LoginRequest = {
      email: String(formData.get("email") ?? "").trim(),
      password: String(formData.get("password") ?? ""),
    };

    if (!payload.email || !payload.password) {
      toast.error("Pleas enter email and password");
      return;
    }

    submitLogin.mutate(payload);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="login-form" onSubmit={onSubmit}>
          <div className="flex flex-col gap-6">
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
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input id="password" name="password" type="password" required />
              <div className="flex items-center">
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  <Link to={APP_ROUTES.FORGOT_PASSWORD}>Forgot your password?</Link>
                </a>
                <CardAction>
                  <Button variant="link" asChild>
                    <Link to={APP_ROUTES.REGISTER}>Sign Up</Link>
                  </Button>
                </CardAction>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          type="submit"
          form="login-form"
          className="w-full"
          disabled={submitLogin.isPending}
        >
          {submitLogin.isPending ? "Loading..." : "Login"}
        </Button>
        <Button variant="outline" className="w-full">
          Login with Google
        </Button>
      </CardFooter>
    </Card>
  );
}
