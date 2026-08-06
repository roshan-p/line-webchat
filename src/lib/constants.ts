/**
 * Only used while realtime is unavailable. Once Ably is connected the pushes
 * replace polling entirely, and reconnects refetch on their own.
 */
export const POLL_INTERVAL_MS = 5000;

export const LOCALE = 'th-TH';

/** Shared by the server publisher and the browser subscriber. */
export const REALTIME_CHANNEL = 'line-webchat';

export const SIDEBAR_SKELETON_ROWS = 5;
