import { AlertCircle, RotateCw } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "@/lib/utils";
import type { AuthErrorAction } from "@/lib/auth-error-message";

type AuthErrorAlertProps = {
  message?: string;
  action?: AuthErrorAction;
  onAction?: (onClickKey: NonNullable<AuthErrorAction["onClickKey"]>) => void;
  className?: string;
  /** Hide the outer container (used when the alert is rendered inline with field errors). */
  variant?: "block" | "inline";
};

/**
 * Renders an auth error summary with a follow-up CTA.
 *
 * - `action.href` → rendered as a `<Link>` (preferred for navigation).
 * - `action.onClickKey` → fires `onAction(onClickKey)` so the parent can run
 *   imperative logic (e.g. trigger `mutate()` for retry).
 */
export function AuthErrorAlert({
  message,
  action,
  onAction,
  className,
  variant = "block",
}: AuthErrorAlertProps) {
  if (!message) return null;

  const isInline = variant === "inline";

  const content: ReactNode = (
    <>
      <AlertCircle
        className={cn(isInline ? "mt-0.5 size-3.5" : "size-4", "shrink-0")}
        aria-hidden="true"
      />
      <p
        className={cn(
          "flex-1 leading-snug",
          isInline ? "text-xs font-medium" : "text-sm font-medium",
        )}
      >
        {message}
      </p>
      {renderAction(action, onAction)}
    </>
  );

  if (isInline) {
    return (
      <div
        role="alert"
        className={cn(
          "mt-1 flex items-start gap-1.5 text-destructive",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive",
        className,
      )}
    >
      {content}
    </div>
  );
}

function renderAction(
  action: AuthErrorAction | undefined,
  onAction:
    | ((onClickKey: NonNullable<AuthErrorAction["onClickKey"]>) => void)
    | undefined,
): ReactNode {
  if (!action) return null;

  const isRetry = action.onClickKey === "retry";

  // Use Link for navigation actions, button for retry.
  if (action.href && !isRetry) {
    return (
      <Button asChild variant="link" size="xs" className="h-auto p-0 text-destructive">
        <Link to={action.href}>{action.label}</Link>
      </Button>
    );
  }

  if (action.onClickKey && onAction) {
    return (
      <Button
        variant="outline"
        size="xs"
        onClick={() => onAction(action.onClickKey!)}
        className="shrink-0"
      >
        <RotateCw className="size-3" aria-hidden="true" />
        {action.label}
      </Button>
    );
  }

  return (
    <span className="text-xs font-semibold underline-offset-2 underline">
      {action.label}
    </span>
  );
}
