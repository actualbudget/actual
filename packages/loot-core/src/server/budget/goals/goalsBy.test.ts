import * as actions from '../actions';

import { goalsBy } from './goalsBy';

jest.mock('../actions');

describe('goalsBy', () => {
  const mockIsReflectBudget = actions.isReflectBudget as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct budget amount with target in the future and no current balance', async () => {
    // Given
    const template = { amount: 100, month: '2024-12' };
    const current_month = '2024-08';
    const last_month_balance = 0;
    const to_budget = 0;
    const errors: string[] = [];
    const template_lines = [template];
    const l = 0;
    const remainder = 0;
    mockIsReflectBudget.mockReturnValue(false);

    // When
    const result = await goalsBy(
      template_lines,
      current_month,
      template,
      l,
      remainder,
      last_month_balance,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(2000);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  it('should return correct budget amount with target in the future and existing balance towards goal', async () => {
    // Given
    const template = { amount: 100, month: '2024-12' };
    const current_month = '2024-08';
    const last_month_balance = 5000;
    const to_budget = 0;
    const errors: string[] = [];
    const template_lines = [template];
    const l = 0;
    const remainder = 0;
    mockIsReflectBudget.mockReturnValue(false);

    // When
    const result = await goalsBy(
      template_lines,
      current_month,
      template,
      l,
      remainder,
      last_month_balance,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(1000);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  it('should return correct budget amount when target balance met early', async () => {
    // Given
    const template = { amount: 100, month: '2024-12' };
    const current_month = '2024-08';
    const last_month_balance = 10000;
    const to_budget = 0;
    const errors: string[] = [];
    const template_lines = [template];
    const l = 0;
    const remainder = 0;
    mockIsReflectBudget.mockReturnValue(false);

    // When
    const result = await goalsBy(
      template_lines,
      current_month,
      template,
      l,
      remainder,
      last_month_balance,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(result.remainder).toBe(0);
  });

  it('should return error when budget is a reflect budget', async () => {
    // Given
    const template = { amount: -100, month: '2024-08', repeat: 1 };
    const current_month = '2024-08';
    const last_month_balance = 0;
    const to_budget = 0;
    const errors: string[] = [];
    const template_lines = [template];
    const l = 0;
    const remainder = 0;
    mockIsReflectBudget.mockReturnValue(true);

    // When
    const result = await goalsBy(
      template_lines,
      current_month,
      template,
      l,
      remainder,
      last_month_balance,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(0);
    expect(result.errors).toStrictEqual([
      'by templates are not supported in Report budgets',
    ]);
  });
});
