import type { FormEvent } from "react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVerifyAccount } from "@/features/auth/hooks/useVerifyAccount";
import { APP_ROUTES } from "@/router/constans";
import { InputOtp } from "./InputOtp-form";
import { ResendOtpButton } from "./resendOtp-button";

const OTP_LENGTH = 6;
const INITIAL_OTP = Array.from({ length: OTP_LENGTH }, () => "");

export function VerifyAccountView() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [otp, setOtp] = useState(INITIAL_OTP);
  const verifyAccount = useVerifyAccount();
  const otpValue = otp.join("");
  const isOtpComplete = otp.every(Boolean);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpValue.length !== OTP_LENGTH) {
      toast.error(`Please enter a complete ${OTP_LENGTH}-digit OTP code`);
      return;
    }

    if (!email) {
      toast.error("Email is missing. Please start the process again.");
      return;
    }

    verifyAccount.mutate({ email, otp: otpValue });
  };

  if (!email) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Invalid Request</CardTitle>
          <CardDescription>
            Please start the account verification process again.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button asChild>
            <Link to={APP_ROUTES.LOGIN}>Go Back</Link>
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
        <CardTitle>Verify Your Account</CardTitle>
        <CardDescription>
          Enter the code we sent to{" "}
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="verify-account-form" onSubmit={onSubmit}>
          <div className="grid gap-6">
            <InputOtp value={otp} onChange={setOtp} length={OTP_LENGTH} />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <Button
          type="submit"
          form="verify-account-form"
          className="w-full"
          disabled={verifyAccount.isPending || !isOtpComplete}
        >
          {verifyAccount.isPending ? "Verifying..." : "Verify Account"}
        </Button>
        <ResendOtpButton email={email} />
        <div className="text-sm text-muted-foreground">
          Already have an account?{" "}
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
