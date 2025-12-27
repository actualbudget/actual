import { DEFAULT_MAX_DISTANCE } from 'loot-core/shared/constants';
import {
  type PayeeEntity,
  type PayeeLocationEntity,
} from 'loot-core/types/models';

import {
  type GeolocationAdapter,
  type LocationApiClient,
  BrowserGeolocationAdapter,
  SendApiLocationClient,
} from './location-adapters';
import {
  calculateDistance,
  formatDistance,
  type LocationCoordinates,
} from './location-utils';

// Geographic utilities

export class LocationService {
  private currentPosition: LocationCoordinates | null = null;
  private lastLocationTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(
    private geolocation: GeolocationAdapter,
    private apiClient: LocationApiClient,
  ) {}

  formatDistance(meters: number, convertToImperial?: boolean): string {
    return formatDistance(meters, convertToImperial);
  }

  async getCurrentPosition(): Promise<LocationCoordinates> {
    // Return cached position if it's recent
    if (
      this.currentPosition &&
      Date.now() - this.lastLocationTime < this.CACHE_DURATION
    ) {
      return this.currentPosition;
    }

    try {
      this.currentPosition = await this.geolocation.getCurrentPosition();
      this.lastLocationTime = Date.now();
      return this.currentPosition;
    } catch (error) {
      console.warn('Geolocation error:', error);
      throw new Error(`Location error: ${error}`);
    }
  }

  async savePayeeLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string> {
    try {
      return await this.apiClient.saveLocation(payeeId, coordinates);
    } catch (error) {
      console.error('Failed to save payee location:', error);
      throw error;
    }
  }

  async getPayeeLocations(payeeId: string): Promise<PayeeLocationEntity[]> {
    try {
      return await this.apiClient.getLocations(payeeId);
    } catch (error) {
      console.error('Failed to get payee locations:', error);
      return [];
    }
  }

  async deletePayeeLocation(locationId: string): Promise<void> {
    try {
      await this.apiClient.deleteLocation(locationId);
    } catch (error) {
      console.error('Failed to delete payee location:', error);
      throw error;
    }
  }

  async getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number = DEFAULT_MAX_DISTANCE,
  ): Promise<PayeeEntity[]> {
    try {
      return await this.apiClient.getNearbyPayees(coordinates, maxDistance);
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
        const distance = calculateDistance(
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
   * Reset the cached location data
   * Useful for testing or when you want to force a fresh location request
   */
  reset(): void {
    this.currentPosition = null;
    this.lastLocationTime = 0;
  }
}

// Default instance with browser implementations
export const locationService = new LocationService(
  new BrowserGeolocationAdapter(),
  new SendApiLocationClient(),
);
