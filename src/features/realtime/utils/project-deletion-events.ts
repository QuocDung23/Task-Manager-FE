type ProjectDeletedListener = (projectId: string) => void;

const listeners = new Set<ProjectDeletedListener>();

export function notifyProjectDeleted(projectId: string): void {
  listeners.forEach((listener) => listener(projectId));
}

export function subscribeToProjectDeleted(
  listener: ProjectDeletedListener,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
