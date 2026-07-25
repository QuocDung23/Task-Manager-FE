import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTheme } from "@/services/themeColor";
import { SidebarMain } from "./sidebar-main-view";

export function MainLayout() {
  useTheme();

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <SidebarMain />
        <SidebarInset className="relative isolate overflow-x-hidden bg-background text-foreground">
          <main className="flex w-full flex-1 flex-col px-6 py-8 md:px-10 md:py-8 lg:px-10">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
