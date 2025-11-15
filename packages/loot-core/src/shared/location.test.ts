// @ts-strict-ignore
import { vi } from 'vitest';
import { locationService } from './location';
import { DEFAULT_MAX_DISTANCE } from 'loot-core/shared/constants';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
};

// Mock send function for API calls
const mockSend = vi.fn();

// Setup global mocks
Object.defineProperty(global, 'navigator', {
  value: {
    geolocation: mockGeolocation,
  },
  configurable: true,
});

vi.mock('loot-core/platform/client/fetch', () => ({
  send: mockSend,
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset location service state
  (locationService as any).currentPosition = null;
  (locationService as any).lastLocationTime = 0;
});

describe('LocationService', () => {
  describe('getCurrentPosition', () => {
    test('successfully gets current position', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      mockGeolocation.getCurrentPosition.mockImplementation(success => {
        success(mockPosition);
      });

      const position = await locationService.getCurrentPosition();

      expect(position).toEqual({
        latitude: 40.7128,
        longitude: -74.006,
      });
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.objectContaining({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }),
      );
    });

    test('returns cached position when recent', async () => {
      const mockPosition = {
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      };

      // First call
      mockGeolocation.getCurrentPosition.mockImplementation(success => {
        success(mockPosition);
      });

      const position1 = await locationService.getCurrentPosition();

      // Second call immediately after (should use cache)
      const position2 = await locationService.getCurrentPosition();

      expect(position1).toEqual(position2);
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
    });

    test('rejects when geolocation is not supported', async () => {
      // Temporarily remove geolocation support
      const originalNavigator = global.navigator;
      global.navigator = {} as Navigator;

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        'Geolocation is not supported by this browser',
      );

      // Restore navigator
      global.navigator = originalNavigator;
    });

    test('rejects when geolocation fails', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error({ message: 'Permission denied' });
        },
      );

      await expect(locationService.getCurrentPosition()).rejects.toThrow(
        'Location error: Permission denied',
      );
    });
  });

  describe('savePayeeLocation', () => {
    test('successfully saves payee location', async () => {
      const mockLocationId = 'location-123';
      mockSend.mockResolvedValue(mockLocationId);

      const payeeId = 'payee-123';
      const coordinates = { latitude: 40.7128, longitude: -74.006 };

      const result = await locationService.savePayeeLocation(
        payeeId,
        coordinates,
      );

      expect(result).toBe(mockLocationId);
      expect(mockSend).toHaveBeenCalledWith('payee-location-create', {
        payee_id: payeeId,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });
    });

    test('throws error when save fails', async () => {
      mockSend.mockRejectedValue(new Error('Save failed'));

      const payeeId = 'payee-123';
      const coordinates = { latitude: 40.7128, longitude: -74.006 };

      await expect(
        locationService.savePayeeLocation(payeeId, coordinates),
      ).rejects.toThrow('Save failed');
    });
  });

  describe('getPayeeLocations', () => {
    test('successfully gets payee locations', async () => {
      const mockLocations = [
        {
          id: 'loc-1',
          payee_id: 'payee-123',
          latitude: 40.7128,
          longitude: -74.006,
        },
        {
          id: 'loc-2',
          payee_id: 'payee-123',
          latitude: 40.75,
          longitude: -74.0,
        },
      ];

      mockSend.mockResolvedValue(mockLocations);

      const payeeId = 'payee-123';
      const result = await locationService.getPayeeLocations(payeeId);

      expect(result).toEqual(mockLocations);
      expect(mockSend).toHaveBeenCalledWith('payee-locations-get', {
        payee_id: payeeId,
      });
    });

    test('returns empty array when get fails', async () => {
      mockSend.mockRejectedValue(new Error('Get failed'));

      const payeeId = 'payee-123';
      const result = await locationService.getPayeeLocations(payeeId);

      expect(result).toEqual([]);
    });
  });

  describe('deletePayeeLocation', () => {
    test('successfully deletes payee location', async () => {
      mockSend.mockResolvedValue(undefined);

      const locationId = 'location-123';
      await locationService.deletePayeeLocation(locationId);

      expect(mockSend).toHaveBeenCalledWith('payee-location-delete', {
        id: locationId,
      });
    });

    test('throws error when delete fails', async () => {
      mockSend.mockRejectedValue(new Error('Delete failed'));

      const locationId = 'location-123';

      await expect(
        locationService.deletePayeeLocation(locationId),
      ).rejects.toThrow('Delete failed');
    });
  });

  describe('getNearbyPayees', () => {
    test('successfully gets nearby payees', async () => {
      const mockNearbyPayees = [
        {
          id: 'payee-1',
          name: 'Starbucks',
          distance: 100,
          location: {
            id: 'loc-1',
            latitude: 40.713,
            longitude: -74.0062,
          },
        },
      ];

      mockSend.mockResolvedValue(mockNearbyPayees);

      const coordinates = { latitude: 40.7128, longitude: -74.006 };
      const radiusMeters = DEFAULT_MAX_DISTANCE;

      const result = await locationService.getNearbyPayees(
        coordinates,
        radiusMeters,
      );

      expect(result).toEqual(mockNearbyPayees);
      expect(mockSend).toHaveBeenCalledWith('payees-get-nearby', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        maxDistance: radiusMeters,
      });
    });

    test('uses default radius when not provided', async () => {
      mockSend.mockResolvedValue([]);

      const coordinates = { latitude: 40.7128, longitude: -74.006 };
      await locationService.getNearbyPayees(coordinates);

      expect(mockSend).toHaveBeenCalledWith('payees-get-nearby', {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        maxDistance: DEFAULT_MAX_DISTANCE,
      });
    });

    test('returns empty array when get fails', async () => {
      mockSend.mockRejectedValue(new Error('Get failed'));

      const coordinates = { latitude: 40.7128, longitude: -74.006 };
      const result = await locationService.getNearbyPayees(coordinates);

      expect(result).toEqual([]);
    });
  });

  describe('savePayeeLocationIfNeeded', () => {
    test('saves location when enabled and no duplicates', async () => {
      const mockPosition = {
        coords: { latitude: 40.7128, longitude: -74.006 },
      };
      const mockExistingLocations: any[] = []; // No existing locations
      const mockLocationId = 'location-123';

      mockGeolocation.getCurrentPosition.mockImplementation(success => {
        success(mockPosition);
      });
      mockSend.mockResolvedValueOnce(mockExistingLocations); // getPayeeLocations
      mockSend.mockResolvedValueOnce(mockLocationId); // savePayeeLocation

      const payeeId = 'payee-123';
      await locationService.savePayeeLocationIfNeeded(payeeId);

      expect(mockSend).toHaveBeenCalledWith('payee-locations-get', {
        payee_id: payeeId,
      });
      expect(mockSend).toHaveBeenCalledWith('payee-location-create', {
        payee_id: payeeId,
        latitude: 40.7128,
        longitude: -74.006,
      });
    });

    test('does not save when duplicate location exists', async () => {
      const mockPosition = {
        coords: { latitude: 40.7128, longitude: -74.006 },
      };
      const mockExistingLocations = [
        {
          id: 'loc-1',
          latitude: 40.7129, // Very close location (within 1000m)
          longitude: -74.0061,
        },
      ];

      mockGeolocation.getCurrentPosition.mockImplementation(success => {
        success(mockPosition);
      });
      mockSend.mockResolvedValue(mockExistingLocations);

      const payeeId = 'payee-123';
      await locationService.savePayeeLocationIfNeeded(payeeId);

      expect(mockSend).toHaveBeenCalledWith('payee-locations-get', {
        payee_id: payeeId,
      });
      // Should not call create since duplicate exists
      expect(mockSend).not.toHaveBeenCalledWith(
        'payee-location-create',
        expect.any(Object),
      );
    });

    test('handles geolocation failure gracefully', async () => {
      mockGeolocation.getCurrentPosition.mockImplementation(
        (success, error) => {
          error({ message: 'Permission denied' });
        },
      );

      const payeeId = 'payee-123';

      // Should not throw
      await expect(
        locationService.savePayeeLocationIfNeeded(payeeId),
      ).resolves.toBeUndefined();
    });
  });

  describe('formatDistance', () => {
    test('formats meters correctly (metric)', () => {
      expect(locationService.formatDistance(50, false)).toBe('50 m');
      expect(locationService.formatDistance(500, false)).toBe('500 m');
      expect(locationService.formatDistance(999, false)).toBe('999 m');
    });

    test('formats kilometers correctly (metric)', () => {
      expect(locationService.formatDistance(1000, false)).toBe('1.0 km');
      expect(locationService.formatDistance(1500, false)).toBe('1.5 km');
      expect(locationService.formatDistance(2500, false)).toBe('2.5 km');
    });

    test('formats feet correctly (imperial)', () => {
      expect(locationService.formatDistance(100, true)).toBe('328 ft');
      expect(locationService.formatDistance(500, true)).toBe('1640 ft');
    });

    test('formats miles correctly (imperial)', () => {
      expect(locationService.formatDistance(1609, true)).toBe('1.0 mi'); // ~1 mile
      expect(locationService.formatDistance(3218, true)).toBe('2.0 mi'); // ~2 miles
    });

    test('defaults to metric when convertToImperial not specified', () => {
      expect(locationService.formatDistance(1000)).toBe('1.0 km');
      expect(locationService.formatDistance(500)).toBe('500 m');
    });
  });
});
