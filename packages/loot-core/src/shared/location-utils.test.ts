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
      // Should be approximately 129,000 meters (allow 5% variance for rounding)
      expect(distance).toBeGreaterThan(122000);
      expect(distance).toBeLessThan(136000);
    });

    it('calculates short distances accurately', () => {
      // Two points very close together (about 100m apart in NYC)
      const pos1 = { latitude: 40.7128, longitude: -74.006 };
      const pos2 = { latitude: 40.7137, longitude: -74.0068 }; // ~100m north

      const distance = calculateDistance(pos1, pos2);
      // Should be approximately 100 meters (allow reasonable variance for coord precision)
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
    describe('metric formatting', () => {
      it('formats meters correctly', () => {
        expect(formatDistance(50)).toBe('50 m');
        expect(formatDistance(500)).toBe('500 m');
        expect(formatDistance(999)).toBe('999 m');
      });

      it('formats kilometers correctly', () => {
        expect(formatDistance(1000)).toBe('1.0 km');
        expect(formatDistance(1500)).toBe('1.5 km');
        expect(formatDistance(2500)).toBe('2.5 km');
        expect(formatDistance(10000)).toBe('10.0 km');
      });

      it('rounds meters to whole numbers', () => {
        expect(formatDistance(50.7)).toBe('51 m');
        expect(formatDistance(999.4)).toBe('999 m');
        expect(formatDistance(999.6)).toBe('1000 m');
      });

      it('formats kilometers to one decimal place', () => {
        expect(formatDistance(1234)).toBe('1.2 km');
        expect(formatDistance(1567)).toBe('1.6 km');
        expect(formatDistance(12345)).toBe('12.3 km');
      });

      it('defaults to metric when convertToImperial not specified', () => {
        expect(formatDistance(1000)).toBe('1.0 km');
        expect(formatDistance(500)).toBe('500 m');
      });

      it('uses metric when convertToImperial is false', () => {
        expect(formatDistance(1000, false)).toBe('1.0 km');
        expect(formatDistance(500, false)).toBe('500 m');
      });
    });

    describe('imperial formatting', () => {
      it('formats feet correctly', () => {
        expect(formatDistance(100, true)).toBe('328 ft');
        expect(formatDistance(500, true)).toBe('1640 ft');
        expect(formatDistance(1000, true)).toBe('3281 ft');
      });

      it('formats miles correctly', () => {
        // 1 mile = 5280 feet = 1609.344 meters
        expect(formatDistance(1610, true)).toBe('1.0 mi'); // Close to 1 mile
        expect(formatDistance(3218, true)).toBe('2.0 mi');
        expect(formatDistance(8047, true)).toBe('5.0 mi');
      });

      it('rounds feet to whole numbers', () => {
        expect(formatDistance(30.48, true)).toBe('100 ft'); // exactly 100 feet
        expect(formatDistance(30, true)).toBe('98 ft');
      });

      it('formats miles to one decimal place', () => {
        expect(formatDistance(2414, true)).toBe('1.5 mi'); // 1.5 miles
        expect(formatDistance(4023, true)).toBe('2.5 mi'); // 2.5 miles
      });

      it('uses feet for distances under 1 mile', () => {
        const almostOneMile = 1607; // Just under 1 mile in meters
        const result = formatDistance(almostOneMile, true);
        expect(result.endsWith(' ft')).toBe(true);
        expect(parseInt(result)).toBeGreaterThan(5270);
        expect(parseInt(result)).toBeLessThan(5280);
      });

      it('uses miles for distances 1 mile and over', () => {
        const exactlyOneMile = 1609.344; // Exactly 1 mile in meters
        expect(formatDistance(exactlyOneMile, true)).toBe('1.0 mi');
      });
    });

    describe('edge cases', () => {
      it('handles zero distance', () => {
        expect(formatDistance(0)).toBe('0 m');
        expect(formatDistance(0, true)).toBe('0 ft');
      });

      it('handles very small distances', () => {
        expect(formatDistance(0.1)).toBe('0 m');
        expect(formatDistance(0.9)).toBe('1 m');
        expect(formatDistance(0.1, true)).toBe('0 ft');
        expect(formatDistance(0.9, true)).toBe('3 ft');
      });

      it('handles very large distances', () => {
        const largeDistance = 1000000; // 1000 km
        expect(formatDistance(largeDistance)).toBe('1000.0 km');
        expect(formatDistance(largeDistance, true)).toBe('621.4 mi');
      });
    });
  });
});
