import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useResendOtp } from "@/features/auth/hooks/useResendOtp";
import { formatTime } from "@/utils/formatTime";

type ResendOtpButtonProps = {
  email: string;
  cooldownSeconds?: number;
};

export function ResendOtpButton({
  email,
  cooldownSeconds = 60,
}: ResendOtpButtonProps) {
  const [secondsLeft, setSecondsLeft] = useState(cooldownSeconds);
  const resendOtp = useResendOtp(email);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSecondsLeft((currentSeconds) =>
        currentSeconds > 0 ? currentSeconds - 1 : 0,
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const canResend = secondsLeft === 0 && !resendOtp.isPending;

  return (
    <div className="text-center text-sm text-muted-foreground">
      {canResend ? (
        <Button
          type="button"
          variant="link"
          className="h-auto p-0 font-medium"
          onClick={() =>
            resendOtp.mutate(undefined, {
              onSuccess: () => {
                setSecondsLeft(cooldownSeconds);
              },
            })
          }
          disabled={resendOtp.isPending}
        >
          {resendOtp.isPending ? "Resending..." : "Resend OTP"}
        </Button>
      ) : (
        <span>Resend OTP in {formatTime(secondsLeft)}</span>
      )}
    </div>
  );
}
