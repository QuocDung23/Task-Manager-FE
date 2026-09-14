import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type FormFieldErrorProps = {
  id?: string;
  message?: string;
  className?: string;
};

/**
 * Inline error message rendered below a form field.
 *
 * - Empty `message` → renders nothing (so consumers can always include it
 *   without guarding).
 * - Uses `role="alert"` so screen readers announce the change as soon as the
 *   message appears (matters for OTP / password wrong attempts).
 * - The `id` should be linked from the input via `aria-describedby` / `aria-errormessage`.
 */
export function FormFieldError({ id, message, className }: FormFieldErrorProps) {
  if (!message) return null;

  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "mt-1 flex items-start gap-1.5 text-xs font-medium leading-snug text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
