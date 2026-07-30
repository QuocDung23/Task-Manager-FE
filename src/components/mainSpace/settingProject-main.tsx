import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { MoreVertical, UserPlus, SquarePen, Trash2 } from "lucide-react";

import { useDeleteProject } from "@/features/projects/hooks/useDeleteProject";
import { UpdateProjectDialog } from "./updateProject-main";
import type { ProjectResponse } from "@/features/projects/types";
import { DialogAddMemberProject } from "../projects/addMember-project";
import { stopDropdownTriggerPropagation } from "@/lib/dropdown-trigger";


interface MenuSettingProps {
  project: ProjectResponse;
}

export function MenuSettingProject({ project }: MenuSettingProps) {
  const [openEdit, setOpenEdit] = useState(false);
  const [openAddMember, setOpenAddMember] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const { mutate: deleteProject, isPending } = useDeleteProject();

  const handleDelete = () => {
    deleteProject(project.id);
  };

  return (
    <div>
      <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Project actions"
            {...stopDropdownTriggerPropagation}
            className="group inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/4 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 data-[state=open]:bg-foreground/4 data-[state=open]:text-foreground"
          >
            <MoreVertical className="size-4.5 transition-transform duration-500  group-data-[state=open]:rotate-90" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-48 rounded-2xl p-1.5 ring-0"
        >
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setOpenMenu(false);
              setTimeout(() => setOpenAddMember(true), 0);
            }}
            className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-foreground/50 "
          >
            <span className="grid size-6 place-items-center rounded-full bg-foreground/4 text-foreground/80">
              <UserPlus className="size-3.5" />
            </span>
            <span>Add member</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setOpenMenu(false);
              setTimeout(() => setOpenEdit(true), 0);
            }}
            className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-foreground/50"
          >
            <span className="grid size-6 place-items-center rounded-full bg-foreground/4 text-foreground/80">
              <SquarePen className="size-3.5" />
            </span>
            <span>Edit</span>
          </DropdownMenuItem>

          <div className="my-1 h-px bg-foreground/6" />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isPending}
            variant="destructive"
            className="cursor-pointer gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-normal text-destructive/90 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus:bg-destructive/10 focus:text-destructive"
          >
            <span className="grid size-6 place-items-center rounded-full bg-destructive/10 text-destructive">
              <Trash2 className="size-3.5" />
            </span>
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogAddMemberProject
        projectId={project.id}
        open={openAddMember}
        onOpenChange={setOpenAddMember}
      />
      <UpdateProjectDialog
        project={project}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  );
}
