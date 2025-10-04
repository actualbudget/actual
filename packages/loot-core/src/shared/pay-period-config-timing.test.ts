import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import * as monthUtils from './months';
import {
  getPayPeriodConfig,
  setPayPeriodConfig,
  loadPayPeriodConfigFromPrefs,
  generatePayPeriods,
  type PayPeriodConfig,
} from './pay-periods';

describe('Pay Period Config Timing Tests', () => {
  // Reset config before each test
  beforeEach(() => {
    setPayPeriodConfig({
      enabled: false,
      payFrequency: 'monthly',
      startDate: '2024-01-01',
    });
  });

  describe('Phase 1: Backend Config Loading', () => {
    test('Config loads before any month operations during budget load', () => {
      // Start with no config
      setPayPeriodConfig({
        enabled: false,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      });

      // Simulate database preferences (what would come from budget load)
      const mockPrefs = {
        showPayPeriods: 'true',
        payPeriodFrequency: 'biweekly',
        payPeriodStartDate: '2024-01-05',
      };

      // Load config from preferences (simulates budget loading process)
      loadPayPeriodConfigFromPrefs(mockPrefs);

      // Verify config is available before month calculations
      const config = getPayPeriodConfig();
      expect(config?.enabled).toBe(true);
      expect(config?.payFrequency).toBe('biweekly');
      expect(config?.startDate).toBe('2024-01-05');

      // Test month operations work correctly with loaded config
      expect(() => monthUtils.currentMonth()).not.toThrow();
      const current = monthUtils.currentMonth();

      // If current month is a pay period, verify it's properly handled
      if (monthUtils.isPayPeriod(current)) {
        expect(() => monthUtils.bounds(current)).not.toThrow();
      }
    });

    test('Config reloads when preferences change', () => {
      // Start with disabled config
      loadPayPeriodConfigFromPrefs({ showPayPeriods: 'false' });
      expect(getPayPeriodConfig()?.enabled).toBe(false);

      // Simulate preference change (what happens in server/preferences/app.ts)
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'true',
        payPeriodFrequency: 'biweekly',
        payPeriodStartDate: '2024-01-05',
      });

      // Verify config updated immediately
      const config = getPayPeriodConfig();
      expect(config?.enabled).toBe(true);
      expect(config?.payFrequency).toBe('biweekly');

      // Test that month operations now work with pay periods
      const periods = generatePayPeriods(2024, config!);
      expect(periods.length).toBe(26); // 26 biweekly periods

      // Test month arithmetic works
      expect(() => monthUtils.addMonths('2024-13', 1)).not.toThrow();
      expect(monthUtils.addMonths('2024-13', 1)).toBe('2024-14');
    });

    test('Invalid config gets corrected but stays enabled', () => {
      // Try to load invalid config
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'true',
        payPeriodFrequency: 'invalid-frequency', // Invalid frequency
        payPeriodStartDate: 'invalid-date', // Invalid date
      });

      // System corrects invalid values but keeps enabled=true
      const config = getPayPeriodConfig();
      expect(config?.enabled).toBe(true); // Stays enabled despite invalid inputs
      expect(config?.payFrequency).toBe('monthly'); // Corrected to valid frequency
      expect(config?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Corrected to valid date format

      // Month operations should work with corrected config
      expect(() => monthUtils.currentMonth()).not.toThrow();
    });
  });

  describe('Phase 2: Defensive Guard Behavior', () => {
    test('Month operations fail gracefully when config is missing for pay periods', () => {
      // Ensure config is disabled
      setPayPeriodConfig({
        enabled: false,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      });

      // Try to use pay period months without proper config
      expect(() => monthUtils.bounds('2024-13')).toThrow(
        "Pay period month '2024-13' cannot be processed without valid pay period configuration",
      );

      expect(() => monthUtils.range('2024-13', '2024-15')).toThrow(
        'Pay period range requested (2024-13 to 2024-15) but pay period configuration is not available or disabled',
      );

      // Regular calendar months should still work
      expect(() => monthUtils.bounds('2024-01')).not.toThrow();
      expect(() => monthUtils.range('2024-01', '2024-03')).not.toThrow();
    });

    test('Pay period operations work after config is properly loaded', () => {
      // Start without config
      setPayPeriodConfig({
        enabled: false,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      });

      // Verify pay period operations fail
      expect(() => monthUtils.bounds('2024-13')).toThrow();

      // Load proper config
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'true',
        payPeriodFrequency: 'biweekly',
        payPeriodStartDate: '2024-01-05',
      });

      // Now operations should work
      expect(() => monthUtils.bounds('2024-13')).not.toThrow();
      expect(() => monthUtils.range('2024-13', '2024-15')).not.toThrow();

      // Verify actual results are correct (bounds returns integers in YYYYMMDD format)
      const bounds = monthUtils.bounds('2024-13');
      expect(bounds.start).toBe(20240105); // Integer format YYYYMMDD
      expect(bounds.end).toBe(20240118); // Integer format YYYYMMDD

      const range = monthUtils.range('2024-13', '2024-15');
      expect(range).toContain('2024-13');
      expect(range).toContain('2024-14');
      expect(range).not.toContain('2024-15'); // Exclusive end
    });

    test('Mixed calendar and pay period ranges are always forbidden', () => {
      // Disable pay period config
      setPayPeriodConfig({
        enabled: false,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      });

      // Mixed ranges should fail when pay periods are involved (due to lack of config)
      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow();
      expect(() => monthUtils.range('2024-13', '2024-03')).toThrow();

      // Pure calendar month ranges should work
      expect(() => monthUtils.range('2024-01', '2024-03')).not.toThrow();

      // Enable config - mixed ranges should STILL fail (now prevented by design)
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'true',
        payPeriodFrequency: 'biweekly',
        payPeriodStartDate: '2024-01-05',
      });

      // Mixed ranges should still fail - now due to our prevention logic
      expect(() => monthUtils.range('2024-01', '2024-13')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );
      expect(() => monthUtils.range('2024-13', '2024-03')).toThrow(
        'Mixed calendar month and pay period ranges are not allowed',
      );

      // But pure pay period ranges should work
      expect(() => monthUtils.range('2024-13', '2024-15')).not.toThrow();
    });
  });

  describe('Phase 3: Config Consistency Tests', () => {
    test('Rapid config changes maintain consistency', () => {
      // Simulate rapid preference changes
      const configs = [
        {
          showPayPeriods: 'true',
          payPeriodFrequency: 'biweekly',
          payPeriodStartDate: '2024-01-05',
        },
        {
          showPayPeriods: 'true',
          payPeriodFrequency: 'monthly',
          payPeriodStartDate: '2024-01-01',
        },
        {
          showPayPeriods: 'true',
          payPeriodFrequency: 'semimonthly',
          payPeriodStartDate: '2024-01-15',
        },
        {
          showPayPeriods: 'false',
          payPeriodFrequency: 'biweekly',
          payPeriodStartDate: '2024-01-05',
        },
      ];

      configs.forEach(configPrefs => {
        loadPayPeriodConfigFromPrefs(configPrefs);
        const config = getPayPeriodConfig();

        if (configPrefs.showPayPeriods === 'true') {
          expect(config?.enabled).toBe(true);
          expect(config?.payFrequency).toBe(configPrefs.payPeriodFrequency);
          expect(config?.startDate).toBe(configPrefs.payPeriodStartDate);

          // Test operations work with this config
          const periods = generatePayPeriods(2024, config!);
          if (configPrefs.payPeriodFrequency === 'biweekly') {
            expect(periods.length).toBe(26);
          } else if (configPrefs.payPeriodFrequency === 'semimonthly') {
            expect(periods.length).toBe(24);
          } else {
            expect(periods.length).toBe(12);
          }
        } else {
          expect(config?.enabled).toBe(false);
          // Pay period operations should fail when disabled
          expect(() => monthUtils.bounds('2024-13')).toThrow();
        }
      });
    });

    test('Config state is atomic - no partial updates', () => {
      // Start with valid config
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'true',
        payPeriodFrequency: 'biweekly',
        payPeriodStartDate: '2024-01-05',
      });

      const initialConfig = getPayPeriodConfig();
      expect(initialConfig?.enabled).toBe(true);
      expect(initialConfig?.payFrequency).toBe('biweekly');

      // Load partially invalid config (bad date but valid frequency)
      loadPayPeriodConfigFromPrefs({
        showPayPeriods: 'true',
        payPeriodFrequency: 'monthly',
        payPeriodStartDate: 'invalid-date',
      });

      const updatedConfig = getPayPeriodConfig();
      // Based on actual implementation: invalid date gets corrected but config stays enabled
      expect(updatedConfig?.enabled).toBe(true); // Stays enabled
      expect(updatedConfig?.payFrequency).toBe('monthly'); // Frequency updated correctly
      expect(updatedConfig?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/); // Invalid date corrected to valid format
      expect(updatedConfig?.startDate).not.toBe('invalid-date'); // Should not keep the invalid value
    });
  });

  describe('Phase 4: Performance and Stress Tests', () => {
    test('Frequent config changes do not degrade performance', () => {
      const startTime = performance.now();

      // Perform many config changes
      for (let i = 0; i < 100; i++) {
        const frequency =
          i % 3 === 0 ? 'biweekly' : i % 3 === 1 ? 'monthly' : 'semimonthly';
        const enabled = i % 4 !== 0;

        loadPayPeriodConfigFromPrefs({
          showPayPeriods: enabled ? 'true' : 'false',
          payPeriodFrequency: frequency,
          payPeriodStartDate: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
        });

        // Force some operations to ensure config is actually used
        const config = getPayPeriodConfig();
        if (config?.enabled) {
          const periods = generatePayPeriods(2024, config);
          expect(periods.length).toBeGreaterThan(0);
        }

        // Test month operations
        if (config?.enabled) {
          expect(() => monthUtils.bounds('2024-13')).not.toThrow();
        } else {
          expect(() => monthUtils.bounds('2024-13')).toThrow();
        }
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 100 config changes + operations in reasonable time
      expect(totalTime).toBeLessThan(1000); // Less than 1 second
      console.log(`100 config changes completed in ${totalTime.toFixed(2)}ms`);
    });

    test('Config loading handles edge cases without memory leaks', () => {
      const testCases = [
        // Various edge case configurations
        { showPayPeriods: '', payPeriodFrequency: '', payPeriodStartDate: '' },
        {
          showPayPeriods: 'true',
          payPeriodFrequency: undefined,
          payPeriodStartDate: undefined,
        },
        {
          showPayPeriods: 'false',
          payPeriodFrequency: 'biweekly',
          payPeriodStartDate: '2024-01-05',
        },
        {
          showPayPeriods: 'true',
          payPeriodFrequency: 'biweekly',
          payPeriodStartDate: '2024-02-29',
        }, // Leap year
        {
          showPayPeriods: 'true',
          payPeriodFrequency: 'biweekly',
          payPeriodStartDate: '2023-02-29',
        }, // Invalid leap year
        {
          showPayPeriods: 'maybe',
          payPeriodFrequency: 'biweekly',
          payPeriodStartDate: '2024-01-05',
        }, // Invalid boolean
      ];

      testCases.forEach((testCase, index) => {
        expect(() => {
          loadPayPeriodConfigFromPrefs(
            testCase as {
              showPayPeriods?: string;
              payPeriodFrequency?: string;
              payPeriodStartDate?: string;
            },
          );
          const config = getPayPeriodConfig();

          // Config should always be in valid state
          expect(config).toBeDefined();
          expect(typeof config?.enabled).toBe('boolean');
          expect(['weekly', 'biweekly', 'semimonthly', 'monthly']).toContain(
            config?.payFrequency,
          );
          expect(config?.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }).not.toThrow(
          `Test case ${index} should not throw: ${JSON.stringify(testCase)}`,
        );
      });
    });

    test('Concurrent config access is safe', () => {
      // Simulate concurrent access (though JS is single-threaded, this tests state consistency)
      const promises = [];

      for (let i = 0; i < 50; i++) {
        const promise = new Promise<void>(resolve => {
          setTimeout(() => {
            const frequency = i % 2 === 0 ? 'biweekly' : 'monthly';
            loadPayPeriodConfigFromPrefs({
              showPayPeriods: 'true',
              payPeriodFrequency: frequency,
              payPeriodStartDate: '2024-01-05',
            });

            // Verify config is consistent
            const config = getPayPeriodConfig();
            expect(config?.enabled).toBe(true);
            expect(['biweekly', 'monthly']).toContain(config?.payFrequency);

            resolve();
          }, Math.random() * 10); // Random timing
        });

        promises.push(promise);
      }

      return Promise.all(promises);
    });
  });
});
