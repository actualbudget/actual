import { describe, it, expect, beforeEach } from 'vitest';

import {
  DEFAULT_MAX_DISTANCE_METERS,
  DEFAULT_RECENT_DUPLICATE_INTERVAL_MS,
} from 'loot-core/shared/constants';
import {
  type PayeeEntity,
  type PayeeLocationEntity,
} from 'loot-core/types/models';

import {
  type GeolocationAdapter,
  type LocationApiClient,
} from './location-adapters';
import { LocationService } from './location-service';
import { type LocationCoordinates } from './location-utils';

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
    private mockNearbyPayees: PayeeEntity[] = [],
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

  async getNearbyPayees(): Promise<PayeeEntity[]> {
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

    it('handles API errors gracefully in background operations', async () => {
      const errorApiClient = new TestApiClient([], [], 'id', true);
      const serviceWithError = new LocationService(
        testGeolocation,
        errorApiClient,
      );

      // Should not throw, just return false
      const result =
        await serviceWithError.savePayeeLocationIfNeeded('payee-123');
      expect(result).toBe(false);
    });
  });

  describe('Duplicate Location Detection', () => {
    it('saves location when no existing locations', async () => {
      const payeeId = 'payee-123';

      const result = await locationService.savePayeeLocationIfNeeded(payeeId);

      expect(result).toBe(true);
      expect(testApiClient.saveLocationCalls).toHaveLength(1);
      expect(testApiClient.saveLocationCalls[0]).toEqual({
        payeeId,
        coordinates: defaultPosition,
      });
    });

    it('does not save when duplicate location exists nearby', async () => {
      const payeeId = 'payee-123';
      // Create a location very close to the current position (within default distance)
      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-1',
          payee_id: payeeId,
          latitude: 40.7129, // ~11m from default position
          longitude: -74.0061,
          created_at: Date.now(),
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.savePayeeLocationIfNeeded(payeeId);

      expect(result).toBe(false);
      expect(testApiClient.saveLocationCalls).toHaveLength(0); // Should not save
    });

    it('saves when existing locations are far enough away', async () => {
      const payeeId = 'payee-123';
      // Create a location far from the current position (beyond default distance)
      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-1',
          payee_id: payeeId,
          latitude: 40.8128, // ~11km from default position
          longitude: -74.006,
          created_at: Date.now(),
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.savePayeeLocationIfNeeded(payeeId);

      expect(result).toBe(true);
      expect(testApiClient.saveLocationCalls).toHaveLength(1);
    });
  });

  describe('Recent Duplicate Detection', () => {
    it('returns true for nearby recent duplicate', async () => {
      const payeeId = 'payee-recent';
      const now = Date.now();

      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-near-recent',
          payee_id: payeeId,
          latitude: defaultPosition.latitude + 0.0001, // ~11m
          longitude: defaultPosition.longitude + 0.0001,
          created_at: now - 5000, // 5s ago, within default interval
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.hasRecentDuplicateLocation(payeeId);
      expect(result).toBe(true);
    });

    it('returns false for nearby but old duplicate', async () => {
      const payeeId = 'payee-old';
      const now = Date.now();

      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-near-old',
          payee_id: payeeId,
          latitude: defaultPosition.latitude + 0.0001,
          longitude: defaultPosition.longitude + 0.0001,
          created_at: now - (DEFAULT_RECENT_DUPLICATE_INTERVAL_MS + 5000), // beyond interval
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.hasRecentDuplicateLocation(payeeId);
      expect(result).toBe(false);
    });

    it('returns false for far duplicate even if recent', async () => {
      const payeeId = 'payee-far-recent';
      const now = Date.now();

      // Place a location ~1km away (well beyond DEFAULT_MAX_DISTANCE=500m)
      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-far-recent',
          payee_id: payeeId,
          latitude: defaultPosition.latitude + 0.009, // ~1km north
          longitude: defaultPosition.longitude,
          created_at: now - 3000,
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.hasRecentDuplicateLocation(payeeId);
      expect(result).toBe(false);
    });

    it('honors custom recent interval override', async () => {
      const payeeId = 'payee-custom-interval';
      const now = Date.now();
      const customInterval = DEFAULT_RECENT_DUPLICATE_INTERVAL_MS + 60000; // extend by 60s

      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-near-custom',
          payee_id: payeeId,
          latitude: defaultPosition.latitude + 0.0001,
          longitude: defaultPosition.longitude + 0.0001,
          created_at: now - (DEFAULT_RECENT_DUPLICATE_INTERVAL_MS + 1000), // outside default, inside custom
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.hasRecentDuplicateLocation(
        payeeId,
        DEFAULT_MAX_DISTANCE_METERS,
        customInterval,
      );
      expect(result).toBe(true);
    });

    it('returns false when geolocation errors', async () => {
      const errorGeolocation = new TestGeolocationAdapter(
        defaultPosition,
        true,
      );
      const payeeId = 'payee-error';
      testApiClient = new TestApiClient([
        {
          id: 'loc-near',
          payee_id: payeeId,
          latitude: defaultPosition.latitude + 0.0001,
          longitude: defaultPosition.longitude + 0.0001,
          created_at: Date.now(),
        },
      ]);
      const serviceWithError = new LocationService(
        errorGeolocation,
        testApiClient,
      );

      const result = await serviceWithError.hasRecentDuplicateLocation(payeeId);
      expect(result).toBe(false);
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

  describe('Distance Formatting', () => {
    it('delegates to pure function correctly', () => {
      expect(locationService.formatDistance(1000)).toBe('1.0 km');
      expect(locationService.formatDistance(500)).toBe('500 m');
      expect(locationService.formatDistance(1000, true)).toBe('3281 ft');
      expect(locationService.formatDistance(1610, true)).toBe('1.0 mi');
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

    it('handles very large distances in duplicate detection', async () => {
      const payeeId = 'payee-far';
      // Location on the opposite side of the Earth
      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-1',
          payee_id: payeeId,
          latitude: -40.7128, // Opposite hemisphere
          longitude: 105.994, // ~Opposite longitude
          created_at: Date.now(),
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      const result = await locationService.savePayeeLocationIfNeeded(payeeId);

      expect(result).toBe(true); // Should save since it's very far away
    });

    it('handles custom distance thresholds', async () => {
      const payeeId = 'payee-custom';
      const customDistance = 100; // 100 meters

      const existingLocations: PayeeLocationEntity[] = [
        {
          id: 'loc-1',
          payee_id: payeeId,
          latitude: 40.7138, // ~110m from default position
          longitude: -74.006,
          created_at: Date.now(),
        },
      ];

      testApiClient = new TestApiClient(existingLocations);
      locationService = new LocationService(testGeolocation, testApiClient);

      // With custom 100m threshold, 110m should be far enough
      const result = await locationService.savePayeeLocationIfNeeded(
        payeeId,
        customDistance,
      );

      expect(result).toBe(true);
      expect(testApiClient.saveLocationCalls).toHaveLength(1);
    });
  });
});
