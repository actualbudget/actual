import { goalsRemainder } from './goalsRemainder';

describe('goalsRemainder', () => {
  it('should calculate the budget correctly when remainder_scale is greater than 0', async () => {
    // Given
    const template = { weight: 100 };
    const budgetAvailable = 1000;
    const remainder_scale = 0.5;
    const to_budget = 0;

    // When
    const result = await goalsRemainder(
      template,
      budgetAvailable,
      remainder_scale,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(50);
  });

  it('should calculate the budget correctly when remainder_scale is 0', async () => {
    // Given
    const template = { weight: 100 };
    const budgetAvailable = 1000;
    const remainder_scale = 0;
    const to_budget = 0;

    // When
    const result = await goalsRemainder(
      template,
      budgetAvailable,
      remainder_scale,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(100);
  });

  it('should calculate the budget correctly when when the calculated budget exceeds the budget available', async () => {
    // Given
    const template = { weight: 1000 };
    const budgetAvailable = 500;
    const remainder_scale = 1;
    const to_budget = 0;

    // When
    const result = await goalsRemainder(
      template,
      budgetAvailable,
      remainder_scale,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(500);
  });

  it('should calculate the budget correctly when there is 1 minor unit leftover from rounding', async () => {
    // Given
    const template = { weight: 499 };
    const budgetAvailable = 500;
    const remainder_scale = 1;
    const to_budget = 0;

    // When
    const result = await goalsRemainder(
      template,
      budgetAvailable,
      remainder_scale,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(500);
  });
});
