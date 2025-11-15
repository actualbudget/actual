import { send } from 'loot-core/platform/client/fetch';
import { type PayeeLocationEntity } from 'loot-core/types/models';
import { DEFAULT_MAX_DISTANCE } from 'loot-core/shared/constants';

const metersInKilometer = 1000;
const metersToFeet = 3.28084;
const feetInMile = 5280;

// Geographic utilities

interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

class LocationService {
  private static instance: LocationService;
  private currentPosition: LocationCoordinates | null = null;
  private lastLocationTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  formatDistance(meters: number, convertToImperial?: boolean): string {
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

  async getCurrentPosition(): Promise<LocationCoordinates> {
    // Return cached position if it's recent
    if (
      this.currentPosition &&
      Date.now() - this.lastLocationTime < this.CACHE_DURATION
    ) {
      return this.currentPosition;
    }

    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      const position = await this.getGeolocationPosition({
        enableHighAccuracy: true,
        timeout: 15000, // 15 second timeout
        maximumAge: 60000, // Accept 1-minute-old cached position
      });

      this.currentPosition = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      this.lastLocationTime = Date.now();
      return this.currentPosition;
    } catch (error) {
      console.warn('Geolocation error:', error);
      throw new Error(`Location error: ${error}`);
    }
  }

  private getGeolocationPosition(
    options: PositionOptions,
  ): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  async savePayeeLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string> {
    try {
      const locationId = await send('payee-location-create', {
        payee_id: payeeId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
      return locationId;
    } catch (error) {
      console.error('Failed to save payee location:', error);
      throw error;
    }
  }

  async getPayeeLocations(payeeId: string): Promise<PayeeLocationEntity[]> {
    try {
      return await send('payee-locations-get', { payee_id: payeeId });
    } catch (error) {
      console.error('Failed to get payee locations:', error);
      return [];
    }
  }

  async deletePayeeLocation(locationId: string): Promise<void> {
    try {
      await send('payee-location-delete', { id: locationId });
    } catch (error) {
      console.error('Failed to delete payee location:', error);
      throw error;
    }
  }

  async getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number = DEFAULT_MAX_DISTANCE,
  ): Promise<any[]> {
    try {
      const result = await send('payees-get-nearby', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        maxDistance: maxDistance,
      });
      return result || [];
    } catch (error) {
      console.error('Failed to get nearby payees:', error);
      return [];
    }
  }

  async savePayeeLocationIfNeeded(
    payeeId: string,
    maxDistance: number = DEFAULT_MAX_DISTANCE,
  ): Promise<boolean> {
    try {
      const currentLocation = await this.getCurrentPosition();

      // Check if there's already a location within a specific distance
      const existingLocations = await this.getPayeeLocations(payeeId);

      const isDuplicate = existingLocations.some(location => {
        const distance = locationService.calculateDistance(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          { latitude: location.latitude, longitude: location.longitude },
        );
        return distance < maxDistance;
      });

      if (!isDuplicate) {
        await this.savePayeeLocation(payeeId, currentLocation);
        console.log(`Saved location for payee ${payeeId}`);
        return true;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Background location save failed';
      console.log('Background location save failed:', errorMessage);
    }

    return false;
  }

  /**
   * Calculate the distance between two geographic coordinates using the Haversine formula
   * @param pos1 First position coordinates
   * @param pos2 Second position coordinates
   * @returns Distance in meters
   */
  calculateDistance(
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
}

export const locationService = LocationService.getInstance();
