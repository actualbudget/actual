/**
 * Pure utility functions for location calculations and formatting.
 * These functions have no side effects and can be easily tested.
 */

const metersInKilometer = 1000;
const metersToFeet = 3.28084;
const feetInMile = 5280;

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
  const deltaLamda = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

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
 * @param convertToImperial Whether to use imperial units (feet/miles) instead of metric (meters/kilometers)
 * @returns Formatted distance string
 */
export function formatDistance(
  meters: number,
  convertToImperial?: boolean,
): string {
  // Use metric system
  if (!convertToImperial) {
    if (meters < metersInKilometer) {
      return `${Math.round(meters)} m`;
    }

    // Convert to kilometers
    return `${(meters / metersInKilometer).toFixed(1)} km`;
  }

  // Convert meters to feet
  const feet = meters * metersToFeet;
  if (feet < feetInMile) {
    // Less than 1 mile
    return `${Math.round(feet)} ft`;
  }

  // Convert to miles
  const miles = feet / feetInMile;
  return `${miles.toFixed(1)} mi`;
}
