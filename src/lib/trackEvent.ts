export interface TrackingEvent {
  timestamp: string;
  sessionEmail: string;
  stepName: string;
  actionType: string;
  metadata?: Record<string, unknown>;
}

const STORAGE_KEY = "covenant_events";

export function trackEvent(
  stepName: string,
  actionType: string,
  metadata?: Record<string, unknown>
): void {
  const email =
    typeof window !== "undefined"
      ? (localStorage.getItem("covenant_email") ?? "anonymous")
      : "anonymous";

  const event: TrackingEvent = {
    timestamp: new Date().toISOString(),
    sessionEmail: email,
    stepName,
    actionType,
    metadata,
  };

  console.log("[covenant:track]", event);

  if (typeof window === "undefined") return;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  const events: TrackingEvent[] = raw ? JSON.parse(raw) : [];
  events.push(event);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function getSessionEvents(): TrackingEvent[] {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}
