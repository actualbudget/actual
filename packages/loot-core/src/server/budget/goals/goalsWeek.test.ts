import { goalsWeek } from './goalsWeek';

describe('goalsWeek', () => {
  it('should return the correct budget amount for a weekly repeat', async () => {
    // Given
    const template = { amount: 100, starting: '2024-08-01', weeks: 1 };
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsWeek(
      template,
      current_month,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(50000);
    expect(result.errors).toHaveLength(0);
  });

  it('should return the correct budget amount for a bi-weekly repeat', async () => {
    // Given
    const template = { amount: '100', starting: '2024-08-01', weeks: 2 };
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsWeek(
      template,
      current_month,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(30000);
    expect(result.errors).toHaveLength(0);
  });

});
