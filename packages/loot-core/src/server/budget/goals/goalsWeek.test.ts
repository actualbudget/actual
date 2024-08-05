import { goalsWeek } from './goalsWeek';

describe('goalsWeek', () => {
  it('should return the correct budget amount for a weekly repeat', async () => {
    // Given
    const template = { amount: 100, starting: '2024-08-01', weeks: 1 };
    const limit = 0;
    const limitCheck = false;
    const hold = false;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsWeek(
      template,
      limit,
      limitCheck,
      hold,
      current_month,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(50000);
    expect(result.errors).toHaveLength(0);
    expect(result.limit).toBe(0);
    expect(result.limitCheck).toBe(false);
    expect(result.hold).toBe(false);
  });

  it('should return the correct budget amount for a bi-weekly repeat', async () => {
    // Given
    const template = { amount: '100', starting: '2024-08-01', weeks: 2 };
    const limit = 0;
    const limitCheck = false;
    const hold = false;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsWeek(
      template,
      limit,
      limitCheck,
      hold,
      current_month,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(30000);
    expect(result.errors).toHaveLength(0);
    expect(result.limit).toBe(0);
    expect(result.limitCheck).toBe(false);
    expect(result.hold).toBe(false);
  });

  it('should return the correct budget when limit set', async () => {
    // Given
    const template = { amount: 100, starting: '2024-08-01', weeks: 1 };
    const limit = 20000;
    const limitCheck = false;
    const hold = false;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsWeek(
      template,
      limit,
      limitCheck,
      hold,
      current_month,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(50000);
    expect(result.errors).toHaveLength(0);
    expect(result.limit).toBe(20000);
    expect(result.limitCheck).toBe(false);
    expect(result.hold).toBe(false);
  });

  it('should return error when multiple limit checks exist', async () => {
    // Given
    const template = {
      amount: '100',
      starting: '2024-08-01',
      weeks: 1,
      limit: { amount: 100, hold: true },
    };
    const limit = 1000;
    const limitCheck = true;
    const hold = false;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsWeek(
      template,
      limit,
      limitCheck,
      hold,
      current_month,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(0);
    expect(result.errors).toStrictEqual(['More than one “up to” limit found.']);
    expect(result.limit).toBe(1000);
    expect(result.limitCheck).toBe(true);
    expect(result.hold).toBe(false);
  });
});
