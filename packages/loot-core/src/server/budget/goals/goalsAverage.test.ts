import * as actions from '../actions';

import { goalsAverage } from './goalsAverage';

jest.mock('../actions');

describe('goalsAverage', () => {
  const mockGetSheetValue = actions.getSheetValue as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate the amount to budget based on the average of only one previous month of spending', async () => {
    // Given
    const template = { amount: 1 };
    const month = '2024-07';
    const category = { id: 1 };
    const errors: string[] = [];
    const to_budget = 0;

    mockGetSheetValue.mockResolvedValueOnce(200);

    // When
    const result = await goalsAverage(
      template,
      month,
      category,
      errors,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(-200);
    expect(result.errors).toHaveLength(0);
  });

  it('should calculate the amount to budget based on the average of multiple previous months of spending', async () => {
    // Given
    const template = { amount: 4 };
    const month = '2024-08';
    const category = { id: 1 };
    const errors: string[] = [];
    const to_budget = 0;

    mockGetSheetValue
      .mockResolvedValueOnce(200)
      .mockResolvedValueOnce(300)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(400);

    // When
    const result = await goalsAverage(
      template,
      month,
      category,
      errors,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(-250);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error when template amount passed in is <= 0', async () => {
    // Given
    const template = { amount: 0 };
    const month = '2024-08';
    const category = { id: 1 };
    const errors: string[] = [];
    const to_budget = 1000;

    // When
    const result = await goalsAverage(
      template,
      month,
      category,
      errors,
      to_budget,
    );

    // Then
    expect(result.to_budget).toBe(1000);
    expect(result.errors).toStrictEqual([
      'Number of months to average is not valid',
    ]);
  });
});
