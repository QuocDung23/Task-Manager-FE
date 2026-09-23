export type MemberScope = "project" | "board";

export type MemberItem = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  roleId: string;
  role?: string;
  isOwner?: boolean;
};

export const MEMBER_ROLE_LABELS: Record<string, string> = {
  PROJECT_ADMIN: "Admin",
  PROJECT_MEMBER: "Member",
  BOARD_ADMIN: "Admin",
  BOARD_MEMBER: "Member",
};

export function getMemberRoleLabel(roleName?: string | null): string {
  if (roleName && MEMBER_ROLE_LABELS[roleName]) return MEMBER_ROLE_LABELS[roleName];
  return isAdminRole(roleName) ? "Admin" : "Member";
}

export function isAdminRole(roleName?: string | null): boolean {
  return Boolean(roleName && roleName.endsWith("_ADMIN"));
}

export function roleNamesForScope(scope: MemberScope): {
  admin: string;
  member: string;
} {
  const prefix = scope.toUpperCase();
  return { admin: `${prefix}_ADMIN`, member: `${prefix}_MEMBER` };
}

export function countAdminMembers(members: MemberItem[]): number {
  return members.filter(
    (member) => member.isOwner || isAdminRole(member.role),
  ).length;
}

export function getMemberInitials(
  name?: string | null,
  email?: string | null,
): string {
  const source = (name && name.trim()) || (email && email.trim()) || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}