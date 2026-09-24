// location: frontend/lib/detection-node/constants.ts
export const NODES_REFRESH_MS = 10_000;
/** How often to re-check an offline camera so the feed appears on its own when it comes back. */
export const OFFLINE_RECHECK_MS = 15_000;
/** Give up and show an error after this many failed reconnects in a row. */
export const MAX_FEED_FAILURES = 6;
export const RECONNECT_DELAY_MS = 3_000;
