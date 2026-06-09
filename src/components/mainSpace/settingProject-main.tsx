import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  LucideEllipsisVertical,
  LucideUserPlus,
  LucideSquarePen,
  LucideTrash2,
} from "lucide-react";
import { useDeleteProject } from "@/features/projects/hooks/useDeleteProject";
import { UpdateProjectDialog } from "./updateProject-main";
import type { ProjectResponse } from "@/features/projects/types";
import { DialogAddMemberProject } from "../projects/addMember-project";

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
    <div >
      <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
        <DropdownMenuTrigger asChild>
          <button type="button" className="inline-flex cursor-pointer">
            <LucideEllipsisVertical size={21} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setOpenMenu(false);
                setTimeout(() => setOpenAddMember(true), 0);
              }}
            >
              <div className="flex items-center gap-2">
                <LucideUserPlus />
                <div>Add Member</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setOpenMenu(false);
                setTimeout(() => setOpenEdit(true), 0);
              }}
            >
              <div className="flex items-center gap-2">
                <LucideSquarePen />
                <div>Edit</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isPending}
            >
              <div className="flex items-center gap-2">
                <LucideTrash2 />
                <div>Delete</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogAddMemberProject
        projectId={project.id}
        open={openAddMember}
        onOpenChange={setOpenAddMember}
      />
      <UpdateProjectDialog project={project} open={openEdit} onOpenChange={setOpenEdit} />
    </div>
  );
}
