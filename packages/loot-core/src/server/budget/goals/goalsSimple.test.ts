import { goalsSimple } from './goalsSimple';

describe('goalsSimple', () => {
  it('should return correct budget amount when limit set and no balance left from previous months', async () => {
    // Given
    const template = { monthly: null, limit: { amount: 100, hold: false } };
    const errors: string[] = [];
    const limit = 10000;
    const to_budget = 0;
    const last_month_balance = 0;

    // When
    const result = await goalsSimple(
      template,
      errors,
      limit,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(10000);
    expect(result.errors).toHaveLength(0);
  });

  it('should return correct budget amount when limit set and balance from previous month left over', async () => {
    // Given
    const template = {monthly: null, limit: { amount: 100, hold: false } };
    const errors: string[] = [];
    const limit = 10000;
    const to_budget = 0;
    const last_month_balance = 2000;

    // When
    const result = await goalsSimple(
      template,
      errors,
      limit,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(8000);
    expect(result.errors).toHaveLength(0);
  });

  it('should return correct budget amount when assigned from previous month is greater than the limit set', async () => {
    // Given
    const template = { monthly: null, limit: { amount: 100, hold: false } };
    const errors: string[] = [];
    const limit = 10000;
    const to_budget = 0;
    const last_month_balance = 20000;

    // When
    const result = await goalsSimple(
      template,
      errors,
      limit,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(-10000);
    expect(result.errors).toHaveLength(0);
  });

  it('should return correct budget amount when both limit and monthly limit set', async () => {
    // Given
    const template = { monthly: 50, limit: { amount: 100, hold: false } };
    const errors: string[] = [];
    const limit = 10000;
    const to_budget = 0;
    const last_month_balance = 0;

    // When
    const result = await goalsSimple(
      template,
      errors,
      limit,
      to_budget,
      last_month_balance,
    );

    // Then
    expect(result.to_budget).toBe(5000);
    expect(result.errors).toHaveLength(0);
  });
});
