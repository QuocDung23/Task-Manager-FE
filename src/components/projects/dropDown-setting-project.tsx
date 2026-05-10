import { LucideSettings } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { DialogAddMemberProject } from "./addMember-project";

export function DropDownSettingProject({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 p-0 cursor-pointer"
          >
            <LucideSettings className="w-10 h-10 text-zinc-500 hover:text-zinc-700" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Setting</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            Add Member
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {projectId && (
        <DialogAddMemberProject
          projectId={projectId}
          open={open}
          onOpenChange={setOpen}
        />
      )}
    </>
  );
}
