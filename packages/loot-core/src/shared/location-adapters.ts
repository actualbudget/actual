import { send } from 'loot-core/platform/client/fetch';
import type { PayeeEntity, PayeeLocationEntity } from 'loot-core/types/models';

import type { LocationCoordinates } from './location-utils';

/**
 * Abstraction for geolocation functionality
 */
export type GeolocationAdapter = {
  getCurrentPosition(options?: PositionOptions): Promise<LocationCoordinates>;
};

/**
 * Abstraction for location-related API calls
 */
export type LocationApiClient = {
  saveLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string>;
  getLocations(payeeId: string): Promise<PayeeLocationEntity[]>;
  deleteLocation(locationId: string): Promise<void>;
  getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number,
  ): Promise<PayeeEntity[]>;
};

/**
 * Browser implementation of geolocation using the Web Geolocation API
 */
export class BrowserGeolocationAdapter implements GeolocationAdapter {
  async getCurrentPosition(
    options: PositionOptions = {},
  ): Promise<LocationCoordinates> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 second timeout
      maximumAge: 60000, // Accept 1-minute-old cached position
    };

    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          ...defaultOptions,
          ...options,
        });
      },
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }
}

/**
 * Implementation using the existing send function for API calls
 */
export class SendApiLocationClient implements LocationApiClient {
  async saveLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string> {
    return await send('payee-location-create', {
      payeeId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  }

  async getLocations(payeeId: string): Promise<PayeeLocationEntity[]> {
    return await send('payee-locations-get', { payeeId });
  }

  async deleteLocation(locationId: string): Promise<void> {
    await send('payee-location-delete', { id: locationId });
  }

  async getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number,
  ): Promise<PayeeEntity[]> {
    const result = await send('payees-get-nearby', {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      maxDistance,
    });
    return result || [];
  }
}
