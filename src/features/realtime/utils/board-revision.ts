const boardRevisions = new Map<string, number>();

export function getBoardRevision(boardId: string): number {
  return boardRevisions.get(boardId) ?? 0;
}

/**
 * Apply a new server-side `orderVersion` for a board only if it is strictly
 * newer than the value already in memory. Returns true when the value was
 * stored, false when the incoming revision was stale.
 */
export function tryAdvanceBoardRevision(
  boardId: string,
  nextRevision: number,
): boolean {
  if (typeof nextRevision !== "number" || !Number.isFinite(nextRevision)) {
    return false;
  }
  const current = boardRevisions.get(boardId) ?? 0;
  if (nextRevision <= current) return false;
  boardRevisions.set(boardId, nextRevision);
  return true;
}

export function resetBoardRevision(boardId: string): void {
  boardRevisions.delete(boardId);
}

export function resetAllBoardRevisions(): void {
  boardRevisions.clear();
}
