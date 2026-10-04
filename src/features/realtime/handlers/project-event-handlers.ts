import type { QueryClient } from "@tanstack/react-query";
import type {
  ProjectCreatedPayload,
  ProjectDeletedPayload,
  ProjectMemberAddedPayload,
  ProjectMemberRemovedPayload,
  ProjectMemberRoleUpdatedPayload,
  ProjectInvitationChangedPayload,
  ProjectUpdatedPayload,
} from "../contracts/realtime-events";
import type { TypedSocket } from "../socket";
import { rememberEvent } from "../utils/event-dedupe";
import { getCurrentUserId } from "../utils/current-user-id";
import { notifyProjectDeleted } from "../utils/project-deletion-events";
import {
  applyProjectCreated,
  applyProjectDeleted,
  applyProjectMemberAdded,
  applyProjectMemberRemoved,
  applyProjectMemberRoleUpdated,
  applyProjectUpdated,
} from "@/features/projects/utils/project-cache";
import { upsertInvitation } from "@/features/projects/utils/project-invitation-cache";
import { projectInvitationKeys } from "@/features/projects/utils/project-invitation-query-keys";
import { boardKeys } from "@/features/boards/utils/board-query-keys";
import type { BoardResponse } from "@/features/boards/types";
import { clearProjectAccessCache } from "@/features/projects/utils/clear-project-access-cache";
import { projectKeys } from "@/features/projects/utils/project-query-keys";
import { router } from "@/router";
import { revokeProjectRoomAccess } from "../rooms/project-room-registry";
import { revokeBoardRoomAccess } from "../rooms/board-room-registry";

function isProjectCreatedPayload(
  value: unknown,
): value is ProjectCreatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProjectCreatedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.project?.id === "string" &&
    typeof payload.data?.project?.userId === "string"
  );
}

function isProjectUpdatedPayload(
  value: unknown,
): value is ProjectUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProjectUpdatedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.project?.id === "string"
  );
}

function isProjectDeletedPayload(
  value: unknown,
): value is ProjectDeletedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProjectDeletedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.project?.id === "string" &&
    payload.data.project.id === payload.data.projectId
  );
}

function isProjectMemberAddedPayload(
  value: unknown,
): value is ProjectMemberAddedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProjectMemberAddedPayload>;
  const member = payload.data?.member;
  const project = payload.data?.project;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof member?.id === "string" &&
    typeof member?.userId === "string" &&
    typeof member?.projectId === "string" &&
    member.projectId === payload.data.projectId &&
    typeof project?.id === "string" &&
    typeof project?.userId === "string" &&
    project.id === payload.data.projectId
  );
}

function isProjectMemberRemovedPayload(
  value: unknown,
): value is ProjectMemberRemovedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProjectMemberRemovedPayload>;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof payload.data?.memberId === "string" &&
    typeof payload.data?.userId === "string"
  );
}

function isProjectMemberRoleUpdatedPayload(
  value: unknown,
): value is ProjectMemberRoleUpdatedPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<ProjectMemberRoleUpdatedPayload>;
  const member = payload.data?.member;
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof member?.id === "string" &&
    typeof member?.projectId === "string" &&
    member.projectId === payload.data.projectId
  );
}

export function registerProjectEventHandlers(
  socket: TypedSocket,
  queryClient: QueryClient,
): () => void {
  const handleCreated = (payload: ProjectCreatedPayload): void => {
    if (!isProjectCreatedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectCreated(queryClient, payload.data.project);
  };

  const handleUpdated = (payload: ProjectUpdatedPayload): void => {
    if (!isProjectUpdatedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectUpdated(queryClient, payload.data.project);
  };

  const handleDeleted = (payload: ProjectDeletedPayload): void => {
    if (!isProjectDeletedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectDeleted(queryClient, payload.data.projectId);
    notifyProjectDeleted(payload.data.projectId);
  };

  const handleMemberAdded = (payload: ProjectMemberAddedPayload): void => {
    if (!isProjectMemberAddedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectMemberAdded(queryClient, payload.data.member);
    const currentUserId = getCurrentUserId(socket);
    if (
      currentUserId &&
      payload.data.member.userId === currentUserId &&
      payload.data.project
    ) {
      applyProjectCreated(queryClient, payload.data.project);
    }
  };

  const handleMemberRemoved = (payload: ProjectMemberRemovedPayload): void => {
    if (!isProjectMemberRemovedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectMemberRemoved(
      queryClient,
      payload.data.projectId,
      payload.data.memberId,
      payload.data.userId,
    );
    if (payload.data.userId === getCurrentUserId(socket)) {
      const path = router.state.location.pathname;
      const boardId = path.startsWith("/board/") ? path.split("/")[2] : null;
      const board = boardId
        ? queryClient.getQueryData<{ data: BoardResponse }>(boardKeys.detail(boardId))?.data
        : null;
      const locationState = router.state.location.state as { projectId?: string } | null;
      const activeBoardProjectId = board?.projectId ?? locationState?.projectId;
      const boardIds = clearProjectAccessCache(queryClient, payload.data.projectId);
      revokeProjectRoomAccess(payload.data.projectId);
      for (const id of boardIds) revokeBoardRoomAccess(id);
      applyProjectDeleted(queryClient, payload.data.projectId);
      void queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      if (path === `/project/${payload.data.projectId}` || (boardId && activeBoardProjectId === payload.data.projectId)) {
        void router.navigate("/projects", { replace: true });
      }
    }
  };

  const handleInvitationChanged = (payload: ProjectInvitationChangedPayload): void => {
    if (!payload || typeof payload.eventId !== "string" || typeof payload.data?.invitation?.id !== "string") return;
    if (!rememberEvent(payload.eventId)) return;
    const invitation = payload.data.invitation;
    upsertInvitation(queryClient, invitation.id, invitation.status, invitation);
    void queryClient.invalidateQueries({ queryKey: projectInvitationKeys.all });
  };

  const handleMemberRoleUpdated = (
    payload: ProjectMemberRoleUpdatedPayload,
  ): void => {
    if (!isProjectMemberRoleUpdatedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectMemberRoleUpdated(queryClient, payload.data.member);
  };

  socket.on("project:created", handleCreated);
  socket.on("project:updated", handleUpdated);
  socket.on("project:deleted", handleDeleted);
  socket.on("project:member_added", handleMemberAdded);
  socket.on("project:member_removed", handleMemberRemoved);
  socket.on("project:member_role_updated", handleMemberRoleUpdated);
  socket.on("project:invitation_changed", handleInvitationChanged);

  return () => {
    socket.off("project:created", handleCreated);
    socket.off("project:updated", handleUpdated);
    socket.off("project:deleted", handleDeleted);
    socket.off("project:member_added", handleMemberAdded);
    socket.off("project:member_removed", handleMemberRemoved);
    socket.off("project:member_role_updated", handleMemberRoleUpdated);
    socket.off("project:invitation_changed", handleInvitationChanged);
  };
}
