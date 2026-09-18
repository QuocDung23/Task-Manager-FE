import { RouterProvider } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AppProviders, router } from "./router";
import { useGlobalRealtime } from "./features/realtime/hooks/useTaskSocket";
import type { JSX } from "react";

function RouterApp(): JSX.Element {
  useGlobalRealtime();
  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <RouterApp />
    </AppProviders>
  );
}
