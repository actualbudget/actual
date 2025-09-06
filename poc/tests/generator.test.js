import { describe, it, expect } from 'vitest';
import { generatePayPeriods } from '../payPeriodGenerator.js';
import { createMockConfig } from '../payPeriodConfig.js';

describe('generatePayPeriods (biweekly)', () => {
  const config = createMockConfig({ payFrequency: 'biweekly', startDate: '2024-01-05', yearStart: 2024 });
  const periods = generatePayPeriods(2024, config);

  it('starts with period 1 at 2024-01-05 to 2024-01-18', () => {
    expect(periods[0]).toMatchObject({
      monthId: '202413',
      startDate: '2024-01-05',
      endDate: '2024-01-18',
      label: 'Pay Period 1',
    });
  });

  it('period 2 spans months correctly', () => {
    expect(periods[1]).toMatchObject({
      monthId: '202414',
      startDate: '2024-01-19',
      endDate: '2024-02-01',
    });
  });

  it('does not exceed 27 periods for biweekly', () => {
    expect(periods.length).toBeLessThanOrEqual(27);
  });
});

describe('frequencies', () => {
  it('weekly ~ 53', () => {
    const config = createMockConfig({ payFrequency: 'weekly' });
    const periods = generatePayPeriods(2024, config);
    expect(periods.length).toBeLessThanOrEqual(53);
  });
  it('semimonthly 24', () => {
    const config = createMockConfig({ payFrequency: 'semimonthly' });
    const periods = generatePayPeriods(2024, config);
    expect(periods).toHaveLength(24);
  });
  it('monthly 12', () => {
    const config = createMockConfig({ payFrequency: 'monthly' });
    const periods = generatePayPeriods(2024, config);
    expect(periods).toHaveLength(12);
  });
});
