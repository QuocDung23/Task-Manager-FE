import { SessionRestoreProvider } from "@/features/auth/hooks/session-restore-provider";
import type { JSX, ReactNode } from "react";

export function AppProviders({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return <SessionRestoreProvider>{children}</SessionRestoreProvider>;
}