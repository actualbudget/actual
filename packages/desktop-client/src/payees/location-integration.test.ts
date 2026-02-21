import { beforeEach, describe, expect, it } from 'vitest';

import type { LocationCoordinates } from 'loot-core/shared/location-utils';
import type {
  NearbyPayeeEntity,
  PayeeLocationEntity,
} from 'loot-core/types/models';

import type {
  GeolocationAdapter,
  LocationApiClient,
} from './location-adapters';
import { LocationService } from './location-service';

// Clean test implementations - no complex mocking needed
class TestGeolocationAdapter implements GeolocationAdapter {
  private callCount = 0;

  constructor(
    private mockPosition: LocationCoordinates,
    private shouldThrow = false,
  ) {}

  async getCurrentPosition(): Promise<LocationCoordinates> {
    this.callCount++;
    if (this.shouldThrow) {
      throw new Error('Geolocation denied');
    }
    return { ...this.mockPosition }; // Return copy to avoid mutation
  }

  getCallCount(): number {
    return this.callCount;
  }
}

class TestApiClient implements LocationApiClient {
  public saveLocationCalls: Array<{
    payeeId: string;
    coordinates: LocationCoordinates;
  }> = [];
  public deleteLocationCalls: string[] = [];
  public getLocationsCalls: string[] = [];

  constructor(
    private mockLocations: PayeeLocationEntity[] = [],
    private mockNearbyPayees: NearbyPayeeEntity[] = [],
    private mockLocationId = 'test-location-id',
    private shouldThrowOnSave = false,
  ) {}

  async saveLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string> {
    this.saveLocationCalls.push({ payeeId, coordinates });
    if (this.shouldThrowOnSave) {
      throw new Error('Save failed');
    }
    return this.mockLocationId;
  }

  async getLocations(payeeId: string): Promise<PayeeLocationEntity[]> {
    this.getLocationsCalls.push(payeeId);
    return this.mockLocations.filter(loc => loc.payee_id === payeeId);
  }

  async deleteLocation(locationId: string): Promise<void> {
    this.deleteLocationCalls.push(locationId);
  }

  async getNearbyPayees(): Promise<NearbyPayeeEntity[]> {
    return this.mockNearbyPayees;
  }
}

describe('LocationService Integration Tests', () => {
  let testGeolocation: TestGeolocationAdapter;
  let testApiClient: TestApiClient;
  let locationService: LocationService;

  const defaultPosition = { latitude: 40.7128, longitude: -74.006 }; // NYC

  beforeEach(() => {
    testGeolocation = new TestGeolocationAdapter(defaultPosition);
    testApiClient = new TestApiClient();
    locationService = new LocationService(testGeolocation, testApiClient);
  });

  describe('Position Caching', () => {
    it('caches position to avoid repeated geolocation calls', async () => {
      const position1 = await locationService.getCurrentPosition();
      const position2 = await locationService.getCurrentPosition();

      expect(position1).toEqual(defaultPosition);
      expect(position2).toEqual(defaultPosition);
      expect(testGeolocation.getCallCount()).toBe(1); // Only called once due to caching
    });

    it('refreshes position after calling reset()', async () => {
      await locationService.getCurrentPosition();
      expect(testGeolocation.getCallCount()).toBe(1);

      locationService.reset();
      await locationService.getCurrentPosition();

      expect(testGeolocation.getCallCount()).toBe(2); // Called again after reset
    });
  });

  describe('Error Handling', () => {
    it('propagates geolocation errors with meaningful messages', async () => {
      const errorGeolocation = new TestGeolocationAdapter(
        defaultPosition,
        true,
      );
      const serviceWithError = new LocationService(
        errorGeolocation,
        testApiClient,
      );

      await expect(serviceWithError.getCurrentPosition()).rejects.toThrow(
        'Geolocation denied',
      );
    });

    it('propagates API save errors', async () => {
      const errorApiClient = new TestApiClient([], [], 'id', true);
      const serviceWithError = new LocationService(
        testGeolocation,
        errorApiClient,
      );

      await expect(
        serviceWithError.savePayeeLocation('payee-123', defaultPosition),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('API Integration', () => {
    it('calls save location with correct parameters', async () => {
      const payeeId = 'payee-456';
      const coordinates = { latitude: 41.8781, longitude: -87.6298 }; // Chicago

      const result = await locationService.savePayeeLocation(
        payeeId,
        coordinates,
      );

      expect(result).toBe('test-location-id');
      expect(testApiClient.saveLocationCalls).toEqual([
        { payeeId, coordinates },
      ]);
    });

    it('retrieves payee locations correctly', async () => {
      const payeeId = 'payee-789';
      const mockLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-1',
          payee_id: payeeId,
          latitude: 40.7128,
          longitude: -74.006,
          created_at: Date.now() - 1000,
        },
        {
          id: 'loc-2',
          payee_id: 'other-payee',
          latitude: 40.75,
          longitude: -74.0,
          created_at: Date.now(),
        },
      ];

      testApiClient = new TestApiClient(mockLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.getPayeeLocations(payeeId);

      expect(result).toHaveLength(1);
      expect(result[0].payee_id).toBe(payeeId);
      expect(testApiClient.getLocationsCalls).toEqual([payeeId]);
    });

    it('deletes location correctly', async () => {
      const locationId = 'location-to-delete';

      await locationService.deletePayeeLocation(locationId);

      expect(testApiClient.deleteLocationCalls).toEqual([locationId]);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero coordinates', async () => {
      testGeolocation = new TestGeolocationAdapter({
        latitude: 0,
        longitude: 0,
      });
      locationService = new LocationService(testGeolocation, testApiClient);

      const position = await locationService.getCurrentPosition();
      expect(position).toEqual({ latitude: 0, longitude: 0 });
    });
  });
});
