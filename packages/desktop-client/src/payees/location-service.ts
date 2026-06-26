import { DEFAULT_MAX_DISTANCE_METERS } from '@actual-app/core/shared/constants';
import type { LocationCoordinates } from '@actual-app/core/shared/location-utils';
import type {
  NearbyPayeeEntity,
  PayeeLocationEntity,
} from '@actual-app/core/types/models';

import type {
  GeolocationAdapter,
  LocationApiClient,
} from './location-adapters';

export class LocationService {
  private currentPosition: LocationCoordinates | null = null;
  private lastLocationTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(
    private geolocation: GeolocationAdapter,
    private apiClient: LocationApiClient,
  ) {}

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
      throw error;
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
      throw error;
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
    maxDistance: number = DEFAULT_MAX_DISTANCE_METERS,
  ): Promise<NearbyPayeeEntity[]> {
    try {
      return await this.apiClient.getNearbyPayees(coordinates, maxDistance);
    } catch (error) {
      console.error('Failed to get nearby payees:', error);
      return [];
    }
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
