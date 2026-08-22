import type { QueryClient } from "@tanstack/react-query";
import type {
  ProjectCreatedPayload,
  ProjectDeletedPayload,
  ProjectMemberAddedPayload,
  ProjectMemberRemovedPayload,
  ProjectMemberRoleUpdatedPayload,
  ProjectUpdatedPayload,
} from "../contracts/realtime-events";
import type { TypedSocket } from "../socket";
import { rememberEvent } from "../utils/event-dedupe";
import {
  applyProjectCreated,
  applyProjectDeleted,
  applyProjectMemberAdded,
  applyProjectMemberRemoved,
  applyProjectMemberRoleUpdated,
  applyProjectUpdated,
} from "@/features/projects/utils/project-cache";

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
  return (
    typeof payload.eventId === "string" &&
    typeof payload.data?.projectId === "string" &&
    typeof member?.id === "string" &&
    typeof member?.userId === "string" &&
    typeof member?.projectId === "string" &&
    member.projectId === payload.data.projectId
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
  };

  const handleMemberAdded = (payload: ProjectMemberAddedPayload): void => {
    if (!isProjectMemberAddedPayload(payload)) return;
    if (!rememberEvent(payload.eventId)) return;
    applyProjectMemberAdded(queryClient, payload.data.member);
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

  return () => {
    socket.off("project:created", handleCreated);
    socket.off("project:updated", handleUpdated);
    socket.off("project:deleted", handleDeleted);
    socket.off("project:member_added", handleMemberAdded);
    socket.off("project:member_removed", handleMemberRemoved);
    socket.off("project:member_role_updated", handleMemberRoleUpdated);
  };
}