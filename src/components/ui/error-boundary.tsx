import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "./button";

const EASE_FLUID = [0.32, 0.72, 0, 1] as const;

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

/**
 * Catches errors thrown during render (not promise rejections).
 *
 * Prevents a blank screen when a component crashes:
 *  - Renders a fallback with an icon, message and "Reload page" button.
 *  - Logs the full stack to the console so developers can debug.
 *
 * Note: this does NOT catch async / event-handler errors. Those are handled
 * by the QueryCache + `getApiErrorMessage` helper (toast).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log the full stack for debugging - never shown to the user here.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return <ErrorBoundaryFallback onReload={this.handleReload} />;
  }
}

function ErrorBoundaryFallback({ onReload }: { onReload: () => void }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_FLUID }}
        className="flex max-w-md flex-col items-center text-center"
      >
        <div className="grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-heading text-[19px] font-semibold leading-tight text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          The application ran into an unexpected problem. Please reload the
          page. If the issue persists, contact your administrator.
        </p>
        <Button onClick={onReload} className="mt-6">
          <RotateCw className="size-4" />
          Reload page
        </Button>
      </motion.div>
    </div>
  );
}
