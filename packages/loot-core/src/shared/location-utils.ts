/**
 * Pure utility functions for location calculations and formatting.
 * These functions have no side effects and can be easily tested.
 */

const metersToFeet = 3.28084;

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param pos1 First position coordinates
 * @param pos2 Second position coordinates
 * @returns Distance in meters
 */
export function calculateDistance(
  pos1: LocationCoordinates,
  pos2: LocationCoordinates,
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (pos1.latitude * Math.PI) / 180;
  const phi2 = (pos2.latitude * Math.PI) / 180;
  const deltaPhi = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const deltaLambda = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLamda / 2) *
      Math.sin(deltaLamda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format a distance in meters to a human-readable string
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  const distanceImperial = `${Math.round(meters * metersToFeet)}ft`;
  const distanceMetric = `${Math.round(meters)}m`;
  return `${distanceImperial} | ${distanceMetric}`;
}
