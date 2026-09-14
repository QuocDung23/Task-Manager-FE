import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";

import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { toast } from "sonner";
import { APP_ROUTES } from "../../router/constans";
import { useVerifyOtp } from "../../features/auth/hooks/useVerifyOtp";
import { ResendOtpButton } from "./resendOtp-button";
import { InputOtp } from "./InputOtp-form";

const OTP_LENGTH = 6;
const INITIAL_OTP = Array.from({ length: OTP_LENGTH }, () => "");

export function ViewVerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [otp, setOtp] = useState(INITIAL_OTP);
  const [otpError, setOtpError] = useState<string | undefined>();
  // The hook fires its own toast; the view only mirrors the error under the
  // OTP input.
  const verifyOtp = useVerifyOtp({
    onAuthError: ({ result }) => {
      setOtpError(result.message);
    },
  });
  const otpValue = otp.join("");
  const isOtpComplete = otp.every(Boolean);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpValue.length !== OTP_LENGTH) {
      const message = `Please enter the full ${OTP_LENGTH}-digit OTP code.`;
      setOtpError(message);
      toast.error(message);
      return;
    }

    if (!email) {
      const message = "Email is missing. Please start the process again.";
      setOtpError(message);
      toast.error(message);
      return;
    }

    setOtpError(undefined);
    verifyOtp.mutate(
      { email, otp: otpValue },
      {
        onSuccess: () => {
          navigate(
            `/reset-password?email=${encodeURIComponent(email)}&otp=${otpValue}`,
          );
        },
      },
    );
  };

  if (!email) {
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
          <CheckCircle className="size-6 text-primary" />
        </div>
        <CardTitle>Enter OTP code</CardTitle>
        <CardDescription>
          We sent a code to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="verify-otp-form" onSubmit={onSubmit} noValidate>
          <div className="grid gap-3">
            <InputOtp
              value={otp}
              onChange={(next) => {
                setOtp(next);
                if (otpError) setOtpError(undefined);
              }}
              length={OTP_LENGTH}
              invalid={Boolean(otpError)}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button
          type="submit"
          form="verify-otp-form"
          className="w-full"
          disabled={verifyOtp.isPending || !isOtpComplete}
        >
          {verifyOtp.isPending ? "Verifying..." : "Verify OTP"}
        </Button>
        <ResendOtpButton email={email} />
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
