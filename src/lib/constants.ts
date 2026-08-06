/**
 * Realtime pushes carry the updates, so polling only needs to be a safety net
 * when it is connected. Without it, polling is the only way to see new chats.
 */
export const POLL_INTERVAL_MS = {
  live: 30000,
  fallback: 5000,
} as const;

export const LOCALE = 'th-TH';

/** Shared by the server publisher and the browser subscriber. */
export const REALTIME_CHANNEL = 'line-webchat';

export const SIDEBAR_SKELETON_ROWS = 5;
