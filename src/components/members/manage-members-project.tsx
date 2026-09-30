import { t } from "@/services/i18n";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AddMemberDialog } from "@/components/projects/addMember-dialog";
import { useAddMemberProject } from "@/features/projects/hooks/useAddMemberProject";
import { useProjectMembers } from "@/features/projects/hooks/useProjectMembers";
import { useRemoveProjectMember } from "@/features/projects/hooks/useRemoveProjectMember";
import { useUpdateProjectMemberRole } from "@/features/projects/hooks/useUpdateProjectMemberRole";
import { useCurrentUser } from "@/features/users/hooks/useCurrentUser";
import type { MemberItem } from "@/lib/member-roles";
import { MemberListDialog } from "./member-list-dialog";

interface ManageMembersProjectProps {
  projectId: string;
  ownerUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DialogManageMembersProject({
  projectId,
  ownerUserId,
  open,
  onOpenChange,
}: ManageMembersProjectProps) {
  const navigate = useNavigate();
  const [openAddMember, setOpenAddMember] = useState(false);

  const membersQuery = useProjectMembers(projectId, { enabled: open });
  const currentUserQuery = useCurrentUser();

  const addMemberMutation = useAddMemberProject();
  const removeMemberMutation = useRemoveProjectMember();
  const changeRoleMutation = useUpdateProjectMemberRole();

  const currentUserId = currentUserQuery.data?.data?.id ?? "";

  const members: MemberItem[] = (
    membersQuery.data?.data?.members ?? []
  ).map((member) => ({
    membershipId: member.id,
    userId: member.userId,
    name: member.name,
    email: member.email,
    avatar: member.avatar ?? null,
    roleId: member.roleId,
    role: member.role,
    isOwner: Boolean(ownerUserId && member.userId === ownerUserId),
  }));

  // BE chứa role dưới dạng UUID và chỉ bộc lộ chúng qua payload member
  // (`roleId` uuid + `role` tên). Resolve tên → uuid để body PATCH luôn mang
  // role id hợp lệ.
  const roleUuidByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const raw of membersQuery.data?.data?.members ?? []) {
      if (raw.role && !map.has(raw.role)) map.set(raw.role, raw.roleId);
    }
    return map;
  }, [membersQuery.data]);

  const handleRemoveMember = async (member: MemberItem) => {
    try {
      await removeMemberMutation.mutateAsync({
        projectId,
        memberId: member.membershipId,
      });
      if (member.userId === currentUserId) {
        onOpenChange(false);
        navigate("/projects");
      }
    } catch {
      /* Ignore: the mutation hook surfaces the error toast. */
    }
  };

  const handleChangeRole = async (member: MemberItem, roleName: string) => {
    const roleId = roleUuidByName.get(roleName);
    if (!roleId) {
      toast.error(t("member.resolveRoleFailed", { role: roleName }));
      return;
    }
    try {
      await changeRoleMutation.mutateAsync({
        projectId,
        memberId: member.membershipId,
        roleId,
      });
    } catch {
      /* Ignore: the mutation hook surfaces the error toast. */
    }
  };

  const removingMemberId = removeMemberMutation.isPending
    ? (removeMemberMutation.variables?.memberId ?? null)
    : null;
  const changingRoleMemberId = changeRoleMutation.isPending
    ? (changeRoleMutation.variables?.memberId ?? null)
    : null;

  return (
    <>
      <MemberListDialog
        scope="project"
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
        scope="project"
        open={open && openAddMember}
        onOpenChange={setOpenAddMember}
        onAdd={(user) =>
          addMemberMutation.mutateAsync({
            projectId,
            data: { userId: user.id },
          })
        }
      />
    </>
  );
}
