import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadNotificationCount } from "@/features/notifications/hooks/useNotifications";
import { NotificationCenter } from "./notification-center";

function BellButton({ count }: { count: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={`Notifications, ${count} unread`}>
          <Bell className="size-4.5" />
          {count > 0 ? <span className="absolute -right-0.5 -top-0.5 grid min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[9px] font-semibold leading-4 text-destructive-foreground">{count > 99 ? "99+" : count}</span> : null}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>Notifications</TooltipContent>
    </Tooltip>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const count = useUnreadNotificationCount().data?.data.count ?? 0;
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild><span><BellButton count={count} /></span></SheetTrigger>
        <SheetContent className="w-[min(100vw,420px)] gap-0 p-0"><SheetTitle className="sr-only">Notifications</SheetTitle><NotificationCenter onNavigate={() => setOpen(false)} /></SheetContent>
      </Sheet>
    );
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><span><BellButton count={count} /></span></PopoverTrigger>
      <PopoverContent align="end" className="flex h-[min(620px,calc(100dvh-5rem))] w-[min(410px,calc(100vw-2rem))] overflow-hidden p-0"><NotificationCenter onNavigate={() => setOpen(false)} /></PopoverContent>
    </Popover>
  );
}
