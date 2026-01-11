/**
 * Default maximum distance (in meters) for nearby payee lookups.
 * Payees with locations beyond this distance are not considered "nearby".
 */
export const DEFAULT_MAX_DISTANCE_METERS = 500;

/**
 * Time window (in milliseconds) for recent duplicate detection.
 * Locations at the same payee within this interval are considered potential duplicates.
 * 37000 ms = 37 seconds.
 */
export const DEFAULT_RECENT_DUPLICATE_INTERVAL_MS = 37000;
