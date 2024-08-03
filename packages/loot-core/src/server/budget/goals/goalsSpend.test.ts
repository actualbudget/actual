import { getSheetValue } from '../actions';

import { goalsSpend } from './goalsSpend';

jest.mock('../actions');

describe('goalsSpend', () => {
  const mockGetSheetValue = getSheetValue as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct budget amount for range when no spending has happened', async () => {
    // Given
    const template = { amount: 60, from: '2024-01', month: '2024-12' };
    const last_month_balance = 0;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];
    const category = { id: 'uuid' };

    mockGetSheetValue
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500);

    // When
    const result = await goalsSpend(
      template,
      last_month_balance,
      current_month,
      to_budget,
      errors,
      category,
    );

    // Then
    expect(result.to_budget).toBe(500);
    expect(result.errors).toHaveLength(0);
  });

  it('should return correct budget amount for range when spending has happened', async () => {
    // Given
    const template = { amount: 60, from: '2024-01', month: '2024-12' };
    const last_month_balance = 0;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];
    const category = { id: 'uuid' };

    mockGetSheetValue
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500)
      .mockResolvedValueOnce(500);

    // When
    const result = await goalsSpend(
      template,
      last_month_balance,
      current_month,
      to_budget,
      errors,
      category,
    );

    // Then
    expect(result.to_budget).toBe(600);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error when range is in the past', async () => {
    // Given
    const template = { amount: 60, from: '2024-01', month: '2024-05' };
    const last_month_balance = 0;
    const current_month = '2024-08-01';
    const to_budget = 0;
    const errors: string[] = [];
    const category = { id: 'uuid' };

    // When
    const result = await goalsSpend(
      template,
      last_month_balance,
      current_month,
      to_budget,
      errors,
      category,
    );

    // Then
    expect(result.to_budget).toBe(0);
    expect(result.errors).toStrictEqual(['2024-05 is in the past.']);
  });
});
