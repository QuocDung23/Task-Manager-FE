import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SidebarMain } from "./sidebar-main-view";

export function MainLayout() {
  return (
    <SidebarProvider>
      <SidebarMain />
      <SidebarInset className="overflow-x-hidden">
        {/* <header className="flex px-4">
          <SidebarTrigger />
        </header> */}
        <main className="flex flex-col flex-1 w-full h-full p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
