import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AddMemberDialog } from "@/components/projects/addMember-dialog";
import { useAddMemberBoard } from "@/features/boards/hooks/useAddMemberBoard";
import { useBoardMembers } from "@/features/boards/hooks/useBoardMembers";
import { useRemoveMemberBoard } from "@/features/boards/hooks/useRemoveMemberBoard";
import { useUpdateBoardMemberRole } from "@/features/boards/hooks/useUpdateBoardMemberRole";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import type { MemberItem } from "@/lib/member-roles";
import { MemberListDialog } from "./member-list-dialog";

interface ManageMembersBoardProps {
  boardId: string;
  projectId: string;
  ownerUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DialogManageMembersBoard({
  boardId,
  projectId,
  ownerUserId,
  open,
  onOpenChange,
}: ManageMembersBoardProps) {
  const [openAddMember, setOpenAddMember] = useState(false);

  const membersQuery = useBoardMembers(boardId, { enabled: open });
  const currentUserQuery = useCurrentUser();

  const addMemberMutation = useAddMemberBoard(boardId, projectId);
  const removeMemberMutation = useRemoveMemberBoard(boardId, projectId);
  const changeRoleMutation = useUpdateBoardMemberRole(boardId, projectId);

  const currentUserId = currentUserQuery.data?.data?.id ?? "";

  const members: MemberItem[] = (membersQuery.data ?? []).map((member) => ({
    membershipId: member.boardMemberId,
    userId: member.id,
    name: member.name,
    email: member.email,
    avatar: member.avatar ?? null,
    roleId: member.roleId,
    role: member.role,
    isOwner: Boolean(ownerUserId && member.id === ownerUserId),
  }));

  const roleUuidByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const raw of membersQuery.data ?? []) {
      if (raw.role && !map.has(raw.role)) map.set(raw.role, raw.roleId);
    }
    return map;
  }, [membersQuery.data]);

  const handleRemoveMember = async (member: MemberItem) => {
    try {
      await removeMemberMutation.mutateAsync(member.userId);
      if (member.userId === currentUserId) {
        onOpenChange(false);
      }
    } catch {
      /* Ignore: the mutation hook surfaces the error toast. */
    }
  };

  const handleChangeRole = async (member: MemberItem, roleName: string) => {
    const roleId = roleUuidByName.get(roleName);
    if (!roleId) {
      toast.error(`Could not resolve role "${roleName}"`);
      return;
    }
    try {
      await changeRoleMutation.mutateAsync({
        userId: member.userId,
        roleId,
      });
    } catch {
      /* Ignore: the mutation hook surfaces the error toast. */
    }
  };

  // Board mutations key on userId, while MemberListRow tracks busy rows by
  // membershipId → resolve the membership id from the current list.
  const removingMemberId = removeMemberMutation.isPending
    ? (members.find(
        (member) => member.userId === removeMemberMutation.variables,
      )?.membershipId ?? null)
    : null;
  const changingRoleMemberId = changeRoleMutation.isPending
    ? (members.find(
        (member) =>
          member.userId === changeRoleMutation.variables?.userId,
      )?.membershipId ?? null)
    : null;

  return (
    <>
      <MemberListDialog
        scope="board"
        open={open}
        onOpenChange={onOpenChange}
        members={members}
        isLoading={membersQuery.isLoading}
        isError={membersQuery.isError}
        currentUserId={currentUserId}
        ownerUserId={ownerUserId}
        removingMemberId={removingMemberId}
        changingRoleMemberId={changingRoleMemberId}
        onRetry={() => void membersQuery.refetch()}
        onAddMember={() => setOpenAddMember(true)}
        onRemoveMember={handleRemoveMember}
        onChangeRole={handleChangeRole}
      />
      <AddMemberDialog
        scope="board"
        projectId={projectId}
        open={open && openAddMember}
        onOpenChange={setOpenAddMember}
        onAdd={(user) => addMemberMutation.mutateAsync(user.id)}
      />
    </>
  );
}
