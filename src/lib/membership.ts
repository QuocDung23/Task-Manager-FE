import { authStorage } from "@/features/auth/storage/auth-storage";

export type MembershipKind = "created-by-me" | "shared-with-me";

export function getCurrentUserId(): string | null {
  return authStorage.getTokenPayload()?.userId ?? null;
}

export function resolveMembership(
  entityOwnerId: string | null | undefined,
  currentUserId: string | null,
): MembershipKind {
  if (currentUserId && entityOwnerId === currentUserId) {
    return "created-by-me";
  }
  return "shared-with-me";
}

export function isCreatedByCurrentUser(
  entityOwnerId: string | null | undefined,
  currentUserId: string | null,
): boolean {
  return resolveMembership(entityOwnerId, currentUserId) === "created-by-me";
}
