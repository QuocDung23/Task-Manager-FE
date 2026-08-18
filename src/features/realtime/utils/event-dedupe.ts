const MAX_EVENT_IDS = 512;
const handledEventIds = new Set<string>();

export function rememberEvent(eventId: string): boolean {
  if (handledEventIds.has(eventId)) return false;
  handledEventIds.add(eventId);
  if (handledEventIds.size > MAX_EVENT_IDS) {
    const oldest = handledEventIds.values().next().value;
    if (oldest) handledEventIds.delete(oldest);
  }
  return true;
}
