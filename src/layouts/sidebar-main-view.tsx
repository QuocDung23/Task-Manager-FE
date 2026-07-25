import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
  Item,
} from "@/components/ui/item";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { ArrowUpRight, Home } from "lucide-react";
import { APP_ROUTES } from "@/router/constans";
import { UserPage } from "@/pages/user/user-page";

const navItems = [
  {
    label: "Overview",
    to: APP_ROUTES.MAIN,
    icon: Home,
  },
] as const;

export function SidebarMain() {
  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="border-r-0 bg-transparent text-sidebar-foreground  **:data-[slot=sidebar-inner]:bg-sidebar"
    >
      <SidebarHeader>
        <div className="mt-3 mb-2 flex items-center gap-3 px-3">
          <div className="relative grid size-9 place-items-center rounded-xl bg-sidebar-primary">
            <span className="text-[13px] font-semibold tracking-tighter text-sidebar-primary-foreground">
              M
            </span>
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate font-heading text-[15px] font-semibold tracking-tight text-sidebar-foreground">
              Task Manager
            </h1>
            <span className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">
              Workspace
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="gap-2 mt-6">
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item, index) => (
              <NavLink key={item.label} to={item.to} end>
                {({ isActive }) => (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.45,
                      delay: 0.05 + index * 0.06,
                      ease: [0.32, 0.72, 0, 1],
                    }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.985 }}
                    className="group"
                  >
                    <Item
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={
                        isActive
                          ? "relative w-full cursor-pointer rounded-lg bg-sidebar-accent px-3 py-2.5 text-sidebar-accent-foreground transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent"
                          : "w-full cursor-pointer rounded-lg px-3 py-2.5 text-sidebar-foreground/65 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-pill"
                          className="absolute inset-0 -z-10 rounded-lg bg-sidebar-accent ring-1 ring-sidebar-border"
                          transition={{
                            type: "spring",
                            stiffness: 380,
                            damping: 32,
                          }}
                        />
                      )}
                      <ItemMedia>
                        <item.icon
                          height={16}
                          width={16}
                          className={
                            isActive
                              ? "size-4 text-sidebar-accent-foreground"
                              : "size-4 text-sidebar-foreground/60 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-sidebar-accent-foreground"
                          }
                        />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle
                          className={
                            isActive
                              ? "text-[13.5px] font-medium text-sidebar-accent-foreground"
                              : "text-[13.5px] font-medium text-sidebar-foreground/65 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-sidebar-accent-foreground"
                          }
                        >
                          {item.label}
                        </ItemTitle>
                      </ItemContent>
                      <ItemActions>
                        <span className="grid size-6 place-items-center rounded-full bg-accent/10 opacity-0 transition-[opacity,transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:bg-accent/20 group-hover:opacity-100">
                          <ArrowUpRight
                            height={16}
                            width={16}
                            className="size-3 text-accent"
                          />
                        </span>
                      </ItemActions>
                    </Item>
                  </motion.div>
                )}
              </NavLink>
            ))}
          </nav>
        </SidebarGroup>
      </SidebarContent>

      <UserPage />
      <SidebarFooter />
    </Sidebar>
  );
}
