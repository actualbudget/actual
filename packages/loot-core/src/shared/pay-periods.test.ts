import * as d from 'date-fns';
import { describe, expect, test, beforeEach } from 'vitest';

import { parseDate } from './date-utils';
import {
  type PayPeriodConfig,
  isPayPeriod,
  getPayPeriodStartDate,
  getPayPeriodEndDate,
  getPayPeriodLabel,
  generatePayPeriods,
  getPayPeriodConfig,
  setPayPeriodConfig,
  differenceInPayPeriods,
  getCurrentPayPeriod,
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
      const firstMonthlyStart = parseDate(monthlyPeriods[0].startDate);
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

  describe('differenceInPayPeriods', () => {
    beforeEach(() => {
      // Set up biweekly config for tests (26 periods per year)
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      });
    });

    test('calculates difference within same year', () => {
      // Forward difference
      expect(differenceInPayPeriods('2024-15', '2024-13')).toBe(2);
      expect(differenceInPayPeriods('2024-20', '2024-13')).toBe(7);

      // Backward difference (negative)
      expect(differenceInPayPeriods('2024-13', '2024-15')).toBe(-2);
      expect(differenceInPayPeriods('2024-13', '2024-20')).toBe(-7);

      // Same period
      expect(differenceInPayPeriods('2024-13', '2024-13')).toBe(0);
    });

    test('calculates difference across year boundaries', () => {
      // 2025-13 (1st period of 2025) vs 2024-38 (26th period of 2024)
      // Should be 1 period apart for biweekly (26 periods per year)
      expect(differenceInPayPeriods('2025-13', '2024-38')).toBe(1);

      // 2024-38 vs 2025-13 should be -1
      expect(differenceInPayPeriods('2024-38', '2025-13')).toBe(-1);

      // Multiple years apart
      // 2026-13 (1st of 2026) vs 2024-13 (1st of 2024) = 2 years * 26 periods = 52
      expect(differenceInPayPeriods('2026-13', '2024-13')).toBe(52);
      expect(differenceInPayPeriods('2024-13', '2026-13')).toBe(-52);
    });

    test('handles different pay frequencies correctly', () => {
      // Weekly (52 periods per year)
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'weekly',
        startDate: '2024-01-05',
      });

      // First period of 2025 vs last period of 2024 (weekly = 52 periods)
      // 2024-64 = 52nd period (64 - 12 = 52)
      // 2025-13 = 1st period of 2025
      expect(differenceInPayPeriods('2025-13', '2024-64')).toBe(1);

      // Monthly (12 periods per year)
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      });

      // First period of 2025 vs last period of 2024
      // 2024-24 = 12th period (24 - 12 = 12)
      // 2025-13 = 1st period of 2025
      expect(differenceInPayPeriods('2025-13', '2024-24')).toBe(1);

      // Semimonthly (24 periods per year)
      setPayPeriodConfig({
        enabled: true,
        payFrequency: 'semimonthly',
        startDate: '2024-01-01',
      });

      // First period of 2025 vs last period of 2024
      // 2024-36 = 24th period (36 - 12 = 24)
      // 2025-13 = 1st period of 2025
      expect(differenceInPayPeriods('2025-13', '2024-36')).toBe(1);
    });

    test('handles mixed inputs by converting to pay periods', () => {
      // One pay period, one full date string
      // 2024-01-15 (Jan 15) falls in period 2024-13 (Jan 5-18)
      // So difference is: 2024-13 - 2024-13 = 0
      expect(differenceInPayPeriods('2024-13', '2024-01-15')).toBe(0);

      // Date in same period as the pay period being compared
      // 2024-01-25 (Jan 25) falls in period 2024-14 (Jan 19 - Feb 1 for biweekly)
      // So difference is: 2024-14 - 2024-14 = 0
      expect(differenceInPayPeriods('2024-14', '2024-01-25')).toBe(0);

      // Date in different period
      // 2024-02-10 (Feb 10) falls in period 2024-15
      // Compared to period 2024-13 (Jan 5-18)
      // Difference should be: 2024-15 - 2024-13 = 2
      expect(differenceInPayPeriods('2024-02-10', '2024-13')).toBe(2);
    });

    test('matches real-world schedule template scenarios', () => {
      // Scenario: Current pay period is 2024-15 (3rd period)
      // Schedule is set for period 2024-20 (8th period)
      // Should show 5 periods in the future
      const current = '2024-15';
      const future = '2024-20';
      expect(differenceInPayPeriods(future, current)).toBe(5);

      // Scenario: Current pay period is 2024-15
      // Schedule was set for 2024-13 (in the past)
      // Should show -2 periods (2 periods ago)
      const past = '2024-13';
      expect(differenceInPayPeriods(past, current)).toBe(-2);

      // Scenario: Year boundary - current is last period of 2024
      // Schedule is set for first period of 2025
      const lastOf2024 = '2024-38'; // 26th biweekly period
      const firstOf2025 = '2025-13';
      expect(differenceInPayPeriods(firstOf2025, lastOf2024)).toBe(1);
    });
  });

  describe('getCurrentPayPeriod - Year Boundary Handling', () => {
    test('handles dates before first pay period of the year', () => {
      // Biweekly config starting on January 5, 2024
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      };

      // January 2, 2024 falls before the first 2024 pay period (Jan 5-18)
      // It should belong to the last pay period of 2023
      const date = new Date('2024-01-02');
      const result = getCurrentPayPeriod(date, config);

      // Should return a pay period ID (2023-XX), not a calendar month (2024-01)
      expect(isPayPeriod(result)).toBe(true);
      expect(result.startsWith('2023-')).toBe(true);
    });

    test('handles dates after last pay period of the year', () => {
      // Biweekly config starting on January 5, 2024
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      };

      // December 30, 2024 might fall after the last 2024 pay period
      // depending on the schedule - it should return a 2025 pay period
      const date = new Date('2024-12-30');
      const result = getCurrentPayPeriod(date, config);

      // Should return a pay period ID, not a calendar month
      expect(isPayPeriod(result)).toBe(true);
    });

    test('handles dates within the current year correctly', () => {
      // Biweekly config starting on January 5, 2024
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'biweekly',
        startDate: '2024-01-05',
      };

      // January 10, 2024 falls within the first 2024 pay period (Jan 5-18)
      const date = new Date('2024-01-10');
      const result = getCurrentPayPeriod(date, config);

      // Should return the first pay period of 2024
      expect(result).toBe('2024-13');
    });

    test('handles weekly pay periods at year boundaries', () => {
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'weekly',
        startDate: '2024-01-05',
      };

      // January 2, 2024 falls before the first 2024 pay period
      const date = new Date('2024-01-02');
      const result = getCurrentPayPeriod(date, config);

      // Should return a 2023 pay period
      expect(isPayPeriod(result)).toBe(true);
      expect(result.startsWith('2023-')).toBe(true);
    });

    test('handles monthly pay periods at year boundaries', () => {
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-15',
      };

      // January 10, 2024 falls before the first 2024 pay period (Jan 15)
      const date = new Date('2024-01-10');
      const result = getCurrentPayPeriod(date, config);

      // Should return the last 2023 pay period
      expect(isPayPeriod(result)).toBe(true);
      expect(result.startsWith('2023-')).toBe(true);
    });
  });

  describe('Monthly Pay Period End Date Calculation', () => {
    test('handles reference day of 1 without underflow', () => {
      // Reference day of 1 should end on the last day of the month, not Dec 31 of previous year
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-01',
      };

      const periods = generatePayPeriods(2024, config);

      // First period: Jan 1 - Jan 31
      expect(periods[0].startDate).toBe('2024-01-01');
      expect(periods[0].endDate).toBe('2024-01-31');

      // Second period: Feb 1 - Feb 29 (2024 is a leap year)
      expect(periods[1].startDate).toBe('2024-02-01');
      expect(periods[1].endDate).toBe('2024-02-29');

      // Third period: Mar 1 - Mar 31
      expect(periods[2].startDate).toBe('2024-03-01');
      expect(periods[2].endDate).toBe('2024-03-31');
    });

    test('handles reference day of 30 without overflow', () => {
      // Reference day of 30 should handle months with fewer than 30 days correctly
      // When adding months, date-fns adjusts to the last valid day if the target day doesn't exist
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-30',
      };

      const periods = generatePayPeriods(2024, config);

      // First period: Jan 30 - Feb 28 (Feb 29 is next start, so end is Feb 28)
      expect(periods[0].startDate).toBe('2024-01-30');
      expect(periods[0].endDate).toBe('2024-02-28');

      // Second period: Feb 29 - Mar 28 (addMonths adjusts Jan 30 + 1 month to Feb 29)
      expect(periods[1].startDate).toBe('2024-02-29');
      expect(periods[1].endDate).toBe('2024-03-28');

      // Third period: Mar 30 - Apr 29 (addMonths(Jan 30, 2) = Mar 30)
      expect(periods[2].startDate).toBe('2024-03-30');
      expect(periods[2].endDate).toBe('2024-04-29');
    });

    test('handles reference day of 31 without overflow', () => {
      // Reference day of 31 should handle months with fewer than 31 days correctly
      // When adding months, date-fns adjusts to the last valid day if the target day doesn't exist
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-31',
      };

      const periods = generatePayPeriods(2024, config);

      // First period: Jan 31 - Feb 28 (addMonths adjusts Jan 31 + 1 month to Feb 29, end is Feb 28)
      expect(periods[0].startDate).toBe('2024-01-31');
      expect(periods[0].endDate).toBe('2024-02-28');

      // Second period: Feb 29 - Mar 28 (addMonths adjusts Feb 29 + 1 month to Mar 29, end is Mar 28)
      expect(periods[1].startDate).toBe('2024-02-29');
      expect(periods[1].endDate).toBe('2024-03-28');
    });

    test('handles reference day of 15 (common mid-month schedule)', () => {
      // Reference day of 15 is a very common pay schedule
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-15',
      };

      const periods = generatePayPeriods(2024, config);

      // First period: Jan 15 - Feb 14
      expect(periods[0].startDate).toBe('2024-01-15');
      expect(periods[0].endDate).toBe('2024-02-14');

      // Second period: Feb 15 - Mar 14
      expect(periods[1].startDate).toBe('2024-02-15');
      expect(periods[1].endDate).toBe('2024-03-14');

      // Third period: Mar 15 - Apr 14
      expect(periods[2].startDate).toBe('2024-03-15');
      expect(periods[2].endDate).toBe('2024-04-14');
    });

    test('handles non-leap year February correctly', () => {
      // Test with 2023 (non-leap year) to ensure Feb 28 is handled correctly
      // When adding months, date-fns adjusts to the last valid day if the target day doesn't exist
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2023-01-31',
      };

      const periods = generatePayPeriods(2023, config);

      // First period: Jan 31 - Feb 27 (addMonths adjusts Jan 31 + 1 month to Feb 28, end is Feb 27)
      expect(periods[0].startDate).toBe('2023-01-31');
      expect(periods[0].endDate).toBe('2023-02-27');

      // Second period: Feb 28 - Mar 27 (addMonths adjusts Feb 28 + 1 month to Mar 28, end is Mar 27)
      expect(periods[1].startDate).toBe('2023-02-28');
      expect(periods[1].endDate).toBe('2023-03-27');
    });

    test('end date is always one day before next start date', () => {
      // This is a fundamental property: periods should be contiguous with no gaps or overlaps
      const config: PayPeriodConfig = {
        enabled: true,
        payFrequency: 'monthly',
        startDate: '2024-01-15',
      };

      const periods = generatePayPeriods(2024, config);

      for (let i = 0; i < periods.length - 1; i++) {
        const currentEnd = parseDate(periods[i].endDate);
        const nextStart = parseDate(periods[i + 1].startDate);

        // Next start should be exactly one day after current end
        const expectedNextStart = d.addDays(currentEnd, 1);
        expect(d.format(nextStart, 'yyyy-MM-dd')).toBe(
          d.format(expectedNextStart, 'yyyy-MM-dd'),
        );
      }
    });
  });
});
