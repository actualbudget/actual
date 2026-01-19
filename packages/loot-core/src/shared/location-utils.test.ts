import { describe, it, expect } from 'vitest';

import { calculateDistance, formatDistance } from './location-utils';

describe('Location Utils', () => {
  describe('calculateDistance', () => {
    it('calculates distance between same location as 0', () => {
      const pos = { latitude: 40.7128, longitude: -74.006 };
      const distance = calculateDistance(pos, pos);
      expect(distance).toBe(0);
    });

    it('calculates distance between known coordinates accurately', () => {
      // NYC to Philadelphia (approximately 129 km)
      const nyc = { latitude: 40.7128, longitude: -74.006 };
      const philly = { latitude: 39.9526, longitude: -75.1652 };

      const distance = calculateDistance(nyc, philly);
      // Should be approximately 129,000meters (allow 5% variance for rounding)
      expect(distance).toBeGreaterThan(122000);
      expect(distance).toBeLessThan(136000);
    });

    it('calculates short distances accurately', () => {
      // Two points very close together (about 100m apart in NYC)
      const pos1 = { latitude: 40.7128, longitude: -74.006 };
      const pos2 = { latitude: 40.7137, longitude: -74.0068 }; // ~100m north

      const distance = calculateDistance(pos1, pos2);
      // Should be approximately 100meters (allow reasonable variance for coord precision)
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(130);
    });

    it('handles cross-equator distances', () => {
      const northPole = { latitude: 89.0, longitude: 0 };
      const southPole = { latitude: -89.0, longitude: 0 };

      const distance = calculateDistance(northPole, southPole);
      // Should be very large (close to half Earth's circumference)
      expect(distance).toBeGreaterThan(19000000); // > 19,000 km
    });

    it('handles cross-meridian distances', () => {
      const eastLondon = { latitude: 51.5074, longitude: 179 };
      const westLondon = { latitude: 51.5074, longitude: -179 };

      const distance = calculateDistance(eastLondon, westLondon);
      // Should be a reasonable distance, not the long way around
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1000000); // < 1000 km
    });
  });

  describe('formatDistance', () => {
    it('formats feet/meters correctly', () => {
      expect(formatDistance(0)).toBe('0ft | 0m');
      expect(formatDistance(0.9)).toBe('3ft | 1m');
      expect(formatDistance(50)).toBe('164ft | 50m');
      expect(formatDistance(500)).toBe('1640ft | 500m');
      expect(formatDistance(1000)).toBe('3281ft | 1000m');
      expect(formatDistance(1500)).toBe('4921ft | 1500m');
      expect(formatDistance(2500)).toBe('8202ft | 2500m');
    });
  });
});
