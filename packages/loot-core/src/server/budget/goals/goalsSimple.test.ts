import { goalsSimple } from './goalsSimple';

describe('goalsSimple', () => {
  it('should return correct budget amount when limit set and no balance left from previous months', async () => {
    // Given
    const template = { limit: { amount: 100, hold: false } };
    const limitCheck = false;
    const errors: string[] = [];
    const limit = 0;
    const hold = false;
    const to_budget = 0;
    const last_month_balance = 0;

    // When
    const result = await goalsSimple(
      template,
      limitCheck,
      errors,
      limit,
      hold,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(10000);
    expect(result.errors).toHaveLength(0);
    expect(result.limitCheck).toBe(true);
    expect(result.limit).toBe(10000);
    expect(result.hold).toBe(false);
  });

  it('should return correct budget amount when limit set and balance from previous month left over', async () => {
    // Given
    const template = { limit: { amount: 100, hold: false } };
    const limitCheck = false;
    const errors: string[] = [];
    const limit = 0;
    const hold = false;
    const to_budget = 0;
    const last_month_balance = 2000;

    // When
    const result = await goalsSimple(
      template,
      limitCheck,
      errors,
      limit,
      hold,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(8000);
    expect(result.errors).toHaveLength(0);
    expect(result.limitCheck).toBe(true);
    expect(result.limit).toBe(10000);
  });

  it('should return correct budget amount when assigned from previous month is greater than the limit set', async () => {
    // Given
    const template = { limit: { amount: 100, hold: false } };
    const limitCheck = false;
    const errors: string[] = [];
    const limit = 0;
    const hold = false;
    const to_budget = 0;
    const last_month_balance = 20000;

    // When
    const result = await goalsSimple(
      template,
      limitCheck,
      errors,
      limit,
      hold,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(-10000);
    expect(result.errors).toHaveLength(0);
    expect(result.limitCheck).toBe(true);
    expect(result.limit).toBe(10000);
    expect(result.hold).toBe(false);
  });

  it('should return correct budget amount when both limit  and monthly limit set', async () => {
    // Given
    const template = { monthly: 50, limit: { amount: 100, hold: false } };
    const limitCheck = false;
    const errors: string[] = [];
    const limit = 0;
    const hold = false;
    const to_budget = 0;
    const last_month_balance = 0;

    // When
    const result = await goalsSimple(
      template,
      limitCheck,
      errors,
      limit,
      hold,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(5000);
    expect(result.errors).toHaveLength(0);
    expect(result.limitCheck).toBe(true);
    expect(result.limit).toBe(10000);
    expect(result.hold).toBe(false);
  });

  it('should fail when multiple limit checks exist', async () => {
    // Given
    const template = { limit: { amount: 100, hold: true } };
    const limitCheck = true;
    const errors: string[] = [];
    const limit = 0;
    const hold = true;
    const to_budget = 0;
    const last_month_balance = 200;

    // When
    const result = await goalsSimple(
      template,
      limitCheck,
      errors,
      limit,
      hold,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(0);
    expect(result.errors).toStrictEqual(['More than one “up to” limit found.']);
    expect(result.limitCheck).toBe(true);
    expect(result.limit).toBe(0);
    expect(result.hold).toBe(true);
  });
});
