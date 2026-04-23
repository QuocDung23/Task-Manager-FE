import { NavLink } from "react-router-dom";
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
import { ChevronRightIcon, FolderKanbanIcon } from "lucide-react";

export function SidebarMain() {
  return (
    <Sidebar>
      <SidebarHeader>
        <h1 className="mt-3 flex justify-center font-heading text-2xl font-medium">
          Task-Manager
        </h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <NavLink to="/projects">
            {({ isActive }) => (
              <Item variant={isActive ? "default" : "outline"} size="sm">
                <ItemMedia>
                  <FolderKanbanIcon className="size-4" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Projects</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <ChevronRightIcon className="size-4" />
                </ItemActions>
              </Item>
            )}
          </NavLink>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
