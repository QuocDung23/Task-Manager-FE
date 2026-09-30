import { AlertTriangle, RotateCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useT } from "@/services/i18n";

const EASE_FLUID = [0.32, 0.72, 0, 1] as const;

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "block" | "inline";
  className?: string;
};

export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel,
  variant = "block",
  className,
}: ErrorStateProps) {
  const t = useT();
  const resolvedTitle = title ?? t("error.unknown");
  const resolvedRetryLabel = retryLabel ?? t("common.retry");
  const reduceMotion = useReducedMotion();

  if (variant === "inline") {
    return (
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_FLUID }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-6 text-center",
          className,
        )}
      >
        <p className="text-[13px] font-medium text-destructive">{resolvedTitle}</p>
        {message ? (
          <p className="text-[12.5px] leading-relaxed text-destructive/80">
            {message}
          </p>
        ) : null}
        {onRetry ? (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="mt-1"
          >
            <RotateCw className="size-3.5" />
            {resolvedRetryLabel}
          </Button>
        ) : null}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_FLUID }}
      className={cn(
        "flex min-h-[calc(100dvh-4rem)] w-full items-center justify-center overflow-hidden px-4",
        className,
      )}
    >
      <div className="flex max-w-md flex-col items-center text-center">
        <div className="grid size-11 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h3 className="mt-4 font-heading text-[17px] font-semibold leading-tight text-foreground">
          {resolvedTitle}
        </h3>
        {message ? (
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            {message}
          </p>
        ) : null}
        {onRetry ? (
          <Button onClick={onRetry} className="mt-5">
            <RotateCw className="size-4" />
            {resolvedRetryLabel}
          </Button>
        ) : null}
      </div>
    </motion.div>
  );
}
