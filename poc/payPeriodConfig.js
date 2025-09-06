/**
 * Mock configuration and minimal helpers.
 */

/**
 * Create a default mock config useful for tests and demo.
 * @param {Partial<import('./payPeriodDates.js').PayPeriodConfig>} overrides
 */
export function createMockConfig(overrides = {}) {
  return {
    enabled: true,
    payFrequency: 'biweekly',
    startDate: '2024-01-05',
    payDayOfWeek: 5,
    payDayOfMonth: 15,
    yearStart: 2024,
    ...overrides,
  };
}
