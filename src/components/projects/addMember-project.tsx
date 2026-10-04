import { useInviteMemberProject } from "@/features/projects/hooks/useInviteMemberProject";
import { AddMemberDialog } from "./addMember-dialog";

interface AddMemberProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Project-scoped wrapper around the generic `<AddMemberDialog>`.
 *
 * Keeps the original `DialogAddMemberProject` API so existing callers
 * (`settingProject-main.tsx`) don't need to change. Internally delegates
 * UI to `<AddMemberDialog scope="project" />` and passes the project
 * mutation in via `onAdd`.
 */
export function DialogAddMemberProject({
  projectId,
  open,
  onOpenChange,
}: AddMemberProps) {
  const { mutateAsync } = useInviteMemberProject();

  return (
    <AddMemberDialog
      scope="project"
      projectId={projectId}
      open={open}
      onOpenChange={onOpenChange}
      onAdd={(user) => mutateAsync({ projectId, data: { userId: user.id } })}
    />
  );
}
