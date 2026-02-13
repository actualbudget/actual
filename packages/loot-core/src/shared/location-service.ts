import {
  DEFAULT_MAX_DISTANCE_METERS,
  DEFAULT_RECENT_DUPLICATE_INTERVAL_MS,
} from 'loot-core/shared/constants';
import type { PayeeEntity, PayeeLocationEntity } from 'loot-core/types/models';

import { logger } from '../platform/server/log';

import type {
  GeolocationAdapter,
  LocationApiClient,
} from './location-adapters';
import { calculateDistance, formatDistance } from './location-utils';
import type { LocationCoordinates } from './location-utils';

// Geographic utilities

export class LocationService {
  private currentPosition: LocationCoordinates | null = null;
  private lastLocationTime: number = 0;
  private readonly CACHE_DURATION = 60000; // 1 minute cache

  constructor(
    private geolocation: GeolocationAdapter,
    private apiClient: LocationApiClient,
  ) {}

  formatDistance(meters: number): string {
    return formatDistance(meters);
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
      logger.warn('Geolocation error:', error);
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
      logger.error('Failed to save payee location:', error);
      throw error;
    }
  }

  async getPayeeLocations(payeeId: string): Promise<PayeeLocationEntity[]> {
    try {
      return await this.apiClient.getLocations(payeeId);
    } catch (error) {
      logger.error('Failed to get payee locations:', error);
      throw error;
    }
  }

  async deletePayeeLocation(locationId: string): Promise<void> {
    try {
      await this.apiClient.deleteLocation(locationId);
    } catch (error) {
      logger.error('Failed to delete payee location:', error);
      throw error;
    }
  }

  async getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number = DEFAULT_MAX_DISTANCE_METERS,
  ): Promise<PayeeEntity[]> {
    try {
      return await this.apiClient.getNearbyPayees(coordinates, maxDistance);
    } catch (error) {
      logger.error('Failed to get nearby payees:', error);
      return [];
    }
  }

  async savePayeeLocationIfNeeded(
    payeeId: string,
    maxDistance: number = DEFAULT_MAX_DISTANCE_METERS,
  ): Promise<boolean> {
    try {
      const potentialDuplicateLocations =
        await this.potentialDuplicateLocations(payeeId, maxDistance);
      if (potentialDuplicateLocations.length > 0) {
        return false;
      }

      const currentLocation = await this.getCurrentPosition();
      await this.savePayeeLocation(payeeId, currentLocation);
      return true;
    } catch (error) {
      logger.error('Background location save failed:', error);
    }

    return false;
  }

  /**
   * Determine if the potential duplicate locations are recent
   *
   * @param payeeId The id of the payee for the comparison
   * @param maxDistance The maximum distance to use for the comparison
   * @returns A boolean indicating if the potential duplicate locations are recent
   */
  async hasRecentDuplicateLocation(
    payeeId: string,
    maxDistance: number = DEFAULT_MAX_DISTANCE_METERS,
    recentInterval: number = DEFAULT_RECENT_DUPLICATE_INTERVAL_MS,
  ): Promise<boolean> {
    try {
      const now = Date.now();
      const potentialDuplicateLocations =
        await this.potentialDuplicateLocations(payeeId, maxDistance);
      return potentialDuplicateLocations.some(location => {
        return (
          location.created_at && now - location.created_at <= recentInterval
        );
      });
    } catch (error) {
      logger.error('Recent duplicate check failed:', error);
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

  /**
   * Find potential duplicate locations
   *
   * @param payeeId The id of the payee for the comparison
   * @param maxDistance The maximum distance to use for the comparison
   * @returns Potential duplicate locations
   */
  private async potentialDuplicateLocations(
    payeeId: string,
    maxDistance: number = DEFAULT_MAX_DISTANCE_METERS,
  ): Promise<PayeeLocationEntity[]> {
    try {
      const comparisonLocation = await this.getCurrentPosition();

      // Check if there's already a location within a specific distance
      const existingLocations = await this.getPayeeLocations(payeeId);

      const possibleDuplicateLocations = existingLocations.filter(location => {
        const distance = calculateDistance(
          {
            latitude: comparisonLocation.latitude,
            longitude: comparisonLocation.longitude,
          },
          { latitude: location.latitude, longitude: location.longitude },
        );
        return distance <= maxDistance;
      });

      return possibleDuplicateLocations;
    } catch (error) {
      logger.error('Duplicate location check failed:', error);
    }

    return [];
  }
}
