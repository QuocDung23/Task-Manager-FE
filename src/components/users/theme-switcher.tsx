import { Moon, Sun } from "lucide-react";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { useTheme } from "@/services/themeColor";

export function ThemeSwitcher() {
  const { mode, toggle } = useTheme();

  return (
    <DropdownMenuItem onClick={toggle} className="cursor-pointer">
      {mode === "dark" ? (
        <Sun className="mr-2 h-4 w-4" />
      ) : (
        <Moon className="mr-2 h-4 w-4" />
      )}
      <span>{mode === "dark" ? "Light Mode" : "Dark Mode"}</span>
    </DropdownMenuItem>
  );
}