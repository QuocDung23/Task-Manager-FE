import { useEffect } from "react";
import {
  acquireProjectRoom,
  releaseProjectRoom,
} from "../rooms/project-room-registry";

/** Join the rooms of projects shown on the current list page. */
export function useProjectListRooms(projectIds: readonly string[]): void {
  const idsKey = [...new Set(projectIds)].sort().join("|");

  useEffect(() => {
    if (!idsKey) return;
    const ids = idsKey.split("|");
    for (const projectId of ids) acquireProjectRoom(projectId);
    return () => {
      for (const projectId of ids) releaseProjectRoom(projectId);
    };
  }, [idsKey]);
}
