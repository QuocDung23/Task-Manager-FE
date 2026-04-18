import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useRegister } from "@/features/auth/hooks/useRegister";
import type { FormEvent } from "react";
import { toast } from "sonner";
import type { RegisterRequest } from "@/features/auth/types";

export function ViewRegister() {
  const registerSubmit = useRegister();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const payload: RegisterRequest = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirm-password") ?? ""),
    };

    if (payload.password !== payload.confirmPassword) {
      toast.error("Confirm password does not match");
 
      return;
    }

    registerSubmit.mutate(payload);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Register account</CardTitle>
        <CardDescription>
          Register if you don't have an account yet
        </CardDescription>
        <CardAction>
          <Button variant="link" asChild>
            <Link to="/login">Login</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form id="register-form" onSubmit={onSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Input Name"
                required
              />
            </div>
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
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
              />
            </div>
            <div className="flex items-center justify-end"></div>
          </div>
          <CardFooter className="flex-col gap-2 mt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={registerSubmit.isPending}
            >
              {registerSubmit.isPending ? "Loading..." : "Register"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}
