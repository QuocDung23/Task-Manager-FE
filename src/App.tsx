import { RouterProvider } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { router } from "./router";
import { AppProviders } from "./router/app-providers";
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
