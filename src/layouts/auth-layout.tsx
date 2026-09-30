import { Outlet } from "react-router-dom";
import { LanguageSwitcher } from "@/components/users/language-switcher";

export function AuthLayout() {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center px-4 py-20">
      <div className="absolute right-4 top-4 z-10 sm:right-8 sm:top-8">
        <LanguageSwitcher compact />
      </div>
      <Outlet />
    </div>
  );
}
