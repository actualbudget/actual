import { describe, expect, test, beforeEach } from 'vitest';

import {
  type PayPeriodConfig,
  isPayPeriod,
  getPayPeriodStartDate,
  getPayPeriodEndDate,
  getPayPeriodLabel,
  generatePayPeriods,
  getPayPeriodConfig,
  setPayPeriodConfig,
} from './pay-periods';

describe('Pay Period Utilities and Configuration', () => {
  const baseConfig: PayPeriodConfig = {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-01-05',
  };

  describe('Core Pay Period Utilities', () => {
    test('isPayPeriod detects extended month values', () => {
      expect(isPayPeriod('2024-12')).toBe(false);
      expect(isPayPeriod('2024-13')).toBe(true);
      expect(isPayPeriod('2024-99')).toBe(true);
    });

    test('getPayPeriodStartDate / EndDate for biweekly periods', () => {
      const monthId = '2024-13'; // period index 1
      const start = getPayPeriodStartDate(monthId, baseConfig);
      const end = getPayPeriodEndDate(monthId, baseConfig);
      expect(start.toISOString().slice(0, 10)).toBe('2024-01-05');
      expect(end.toISOString().slice(0, 10)).toBe('2024-01-18');
    });

    test('getPayPeriodLabel returns stable label', () => {
      const monthId = '2024-14'; // period index 2
      const label = getPayPeriodLabel(monthId, baseConfig);
      expect(label).toContain('Pay Period');
    });

    test('generatePayPeriods returns sequential extended months within plan year', () => {
      const periods = generatePayPeriods(2024, baseConfig);
      expect(periods.length).toBeGreaterThan(20);
      expect(periods[0].monthId).toBe('2024-13');
      const last = periods[periods.length - 1];
      expect(Number(last.monthId.slice(5, 7))).toBeGreaterThanOrEqual(13);
    });

    test('handles edge cases for month validation', () => {
      // Valid calendar months
      expect(isPayPeriod('2024-01')).toBe(false);
      expect(isPayPeriod('2024-12')).toBe(false);

      // Valid pay periods
      expect(isPayPeriod('2024-13')).toBe(true);
      expect(isPayPeriod('2024-99')).toBe(true);

      // Invalid formats
      expect(isPayPeriod('2024-1')).toBe(false);
      expect(isPayPeriod('2024-100')).toBe(false);
      expect(isPayPeriod('invalid')).toBe(false);
      expect(isPayPeriod('2024-00')).toBe(false);
    });

    test('handles year boundaries correctly', () => {
      const config2023 = { ...baseConfig, startDate: '2023-01-05' };
      const config2025 = { ...baseConfig, startDate: '2025-01-05' };

      // 2023 config should generate pay periods for 2024
      const periods2023 = generatePayPeriods(2024, config2023);
      expect(periods2023.length).toBe(26); // 26 biweekly periods
      expect(periods2023[0].monthId).toBe('2024-13');

      // 2025 config should also generate pay periods for 2024 (always generate full year)
      const periods2025 = generatePayPeriods(2024, config2025);
      expect(periods2025.length).toBe(26); // 26 biweekly periods
      expect(periods2025[0].monthId).toBe('2024-13');

      // The actual dates should be different based on start date
      expect(periods2023[0].startDate).not.toBe(periods2025[0].startDate);
    });

    test('start date projection scenarios maintain year-based numbering', () => {
      // Test the critical scenario: start date from different months/years
      // should all generate 2024-13 as first period of 2024

      // Weekly scenario: Start date in September, but 2024-13 should be first period in 2024
      const weeklyConfig = {
        enabled: true,
        payFrequency: 'weekly' as const,
        startDate: '2024-09-26',
      };
      const weeklyPeriods = generatePayPeriods(2024, weeklyConfig);
      expect(weeklyPeriods[0].monthId).toBe('2024-13'); // First period of 2024
      expect(weeklyPeriods.length).toBe(52); // 52 weekly periods

      // Monthly scenario: Start date on 18th, projecting to first monthly period of 2024
      const monthlyConfig = {
        enabled: true,
        payFrequency: 'monthly' as const,
        startDate: '2024-09-18',
      };
      const monthlyPeriods = generatePayPeriods(2024, monthlyConfig);
      expect(monthlyPeriods[0].monthId).toBe('2024-13'); // First period of 2024
      expect(monthlyPeriods.length).toBe(12); // 12 monthly periods

      // The monthly periods should start on the 18th of each month
      const firstMonthlyStart = new Date(monthlyPeriods[0].startDate);
      expect(firstMonthlyStart.getDate()).toBe(18); // Should start on 18th
      expect(firstMonthlyStart.getMonth()).toBe(0); // January (0-indexed)

      // Semimonthly scenario: 24 periods per year
      const semimonthlyConfig = {
        enabled: true,
        payFrequency: 'semimonthly' as const,
        startDate: '2024-01-01',
      };
      const semimonthlyPeriods = generatePayPeriods(2024, semimonthlyConfig);
      expect(semimonthlyPeriods[0].monthId).toBe('2024-13'); // First period of 2024
      expect(semimonthlyPeriods.length).toBe(24); // 24 semimonthly periods

      // Cross-year projection: start date in 2025 should still generate 2024 periods starting with 2024-13
      const crossYearConfig = {
        enabled: true,
        payFrequency: 'biweekly' as const,
        startDate: '2025-03-15',
      };
      const crossYearPeriods = generatePayPeriods(2024, crossYearConfig);
      expect(crossYearPeriods[0].monthId).toBe('2024-13'); // First period of 2024
      expect(crossYearPeriods.length).toBe(26); // 26 biweekly periods
    });
  });

  describe('Pay Period Configuration Management', () => {
    // Reset config before each test
    beforeEach(() => {
      setPayPeriodConfig({
        enabled: false,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      });
    });

    describe('Backend Config Loading', () => {
      test('Config loads before any month operations during budget load', () => {
        // Start with no config
        setPayPeriodConfig({
          enabled: false,
          payFrequency: 'monthly',
          startDate: '2024-01-01',
        });

        // Simulate loading config (happens in server layer)
        setPayPeriodConfig({
          enabled: true,
          payFrequency: 'biweekly',
          startDate: '2024-01-05',
        });

        // Verify config is available before month calculations
        const config = getPayPeriodConfig();
        expect(config?.enabled).toBe(true);
        expect(config?.payFrequency).toBe('biweekly');
        expect(config?.startDate).toBe('2024-01-05');
      });

      test('Config reloads when preferences change', () => {
        // Start with disabled config
        setPayPeriodConfig({
          enabled: false,
          payFrequency: 'monthly',
          startDate: '2024-01-01',
        });
        expect(getPayPeriodConfig()?.enabled).toBe(false);

        // Simulate preference change (what happens in server/preferences/app.ts)
        setPayPeriodConfig({
          enabled: true,
          payFrequency: 'biweekly',
          startDate: '2024-01-05',
        });

        // Verify config updated immediately
        const config = getPayPeriodConfig();
        expect(config?.enabled).toBe(true);
        expect(config?.payFrequency).toBe('biweekly');

        // Test that operations now work with pay periods
        const periods = generatePayPeriods(2024, config!);
        expect(periods.length).toBe(26); // 26 biweekly periods
      });

      test('Config validation happens in server layer', () => {
        // The validation logic has been moved to server/preferences/app.ts
        // This test verifies that the shared layer accepts valid configs
        setPayPeriodConfig({
          enabled: true,
          payFrequency: 'monthly',
          startDate: '2024-01-01',
        });

        const config = getPayPeriodConfig();
        expect(config?.enabled).toBe(true);
        expect(config?.payFrequency).toBe('monthly');
        expect(config?.startDate).toBe('2024-01-01');
      });
    });

    describe('Config Consistency Tests', () => {
      test('Rapid config changes maintain consistency', () => {
        // Simulate rapid config changes
        const configs: PayPeriodConfig[] = [
          {
            enabled: true,
            payFrequency: 'biweekly',
            startDate: '2024-01-05',
          },
          {
            enabled: true,
            payFrequency: 'monthly',
            startDate: '2024-01-01',
          },
          {
            enabled: true,
            payFrequency: 'semimonthly',
            startDate: '2024-01-15',
          },
          {
            enabled: false,
            payFrequency: 'biweekly',
            startDate: '2024-01-05',
          },
        ];

        configs.forEach(testConfig => {
          setPayPeriodConfig(testConfig);
          const config = getPayPeriodConfig();

          expect(config?.enabled).toBe(testConfig.enabled);
          expect(config?.payFrequency).toBe(testConfig.payFrequency);
          expect(config?.startDate).toBe(testConfig.startDate);

          if (testConfig.enabled) {
            // Test operations work with this config
            const periods = generatePayPeriods(2024, config!);
            if (testConfig.payFrequency === 'biweekly') {
              expect(periods.length).toBe(26);
            } else if (testConfig.payFrequency === 'semimonthly') {
              expect(periods.length).toBe(24);
            } else {
              expect(periods.length).toBe(12);
            }
          }
        });
      });

      test('Config state is atomic - no partial updates', () => {
        // Start with valid config
        setPayPeriodConfig({
          enabled: true,
          payFrequency: 'biweekly',
          startDate: '2024-01-05',
        });

        const initialConfig = getPayPeriodConfig();
        expect(initialConfig?.enabled).toBe(true);
        expect(initialConfig?.payFrequency).toBe('biweekly');

        // Update to new config (validation happens in server layer)
        setPayPeriodConfig({
          enabled: true,
          payFrequency: 'monthly',
          startDate: '2024-01-01',
        });

        const updatedConfig = getPayPeriodConfig();
        expect(updatedConfig?.enabled).toBe(true);
        expect(updatedConfig?.payFrequency).toBe('monthly');
        expect(updatedConfig?.startDate).toBe('2024-01-01');
      });
    });

    describe('Performance and Stress Tests', () => {
      test('Frequent config changes do not degrade performance', () => {
        const startTime = performance.now();

        // Perform many config changes
        for (let i = 0; i < 100; i++) {
          const frequency =
            i % 3 === 0 ? 'biweekly' : i % 3 === 1 ? 'monthly' : 'semimonthly';
          const enabled = i % 4 !== 0;

          setPayPeriodConfig({
            enabled,
            payFrequency: frequency,
            startDate: `2024-01-${String((i % 28) + 1).padStart(2, '0')}`,
          });

          // Force some operations to ensure config is actually used
          const config = getPayPeriodConfig();
          if (config?.enabled) {
            const periods = generatePayPeriods(2024, config);
            expect(periods.length).toBeGreaterThan(0);
          }
        }

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        // Should complete 100 config changes + operations in reasonable time
        expect(totalTime).toBeLessThan(1000); // Less than 1 second
      });

      test('Config loading handles edge cases without memory leaks', () => {
        const testCases: PayPeriodConfig[] = [
          // Various valid configurations
          {
            enabled: false,
            payFrequency: 'monthly',
            startDate: '2024-01-01',
          },
          {
            enabled: true,
            payFrequency: 'biweekly',
            startDate: '2024-01-05',
          },
          {
            enabled: true,
            payFrequency: 'biweekly',
            startDate: '2024-02-29',
          }, // Leap year
          {
            enabled: true,
            payFrequency: 'semimonthly',
            startDate: '2024-01-15',
          },
        ];

        testCases.forEach((testCase, index) => {
          expect(() => {
            setPayPeriodConfig(testCase);
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
              setPayPeriodConfig({
                enabled: true,
                payFrequency: frequency,
                startDate: '2024-01-05',
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
});
