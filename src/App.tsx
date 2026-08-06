import { RouterProvider } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { router } from "./router";
import { useGlobalRealtime } from "./features/realtime/hooks/useTaskSocket";

export default function App() {
  useGlobalRealtime();
  return (
    <>
        <RouterProvider router={router} />
        <Toaster richColors position="top-right" />
    </>
  );
}
