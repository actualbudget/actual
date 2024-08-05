import * as db from '../../db';
import * as actions from '../actions';

import { goalsPercentage } from './goalsPercentage';

jest.mock('../actions');
jest.mock('../../db');

describe('goalsPercentage', () => {
  const mockGetSheetValue = actions.getSheetValue as jest.Mock;
  const mockGetCategories = db.getCategories as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate the budget based on a percentage of all income for the current month', async () => {
    // Given
    const template = { percent: 10, category: 'all income' };
    const month = '2024-08';
    const available_start = 0;
    const sheetName = '2024-08';
    const to_budget = 0;
    const errors: string[] = [];

    mockGetSheetValue.mockResolvedValueOnce(1000);

    // When
    const result = await goalsPercentage(
      template,
      month,
      available_start,
      sheetName,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(100);
    expect(result.errors).toHaveLength(0);
  });

  it('should calculate the budget based on a percentage of all income for the previous month', async () => {
    // Given
    const template = { percent: 10, category: 'all income', previous: true };
    const month = '2024-08';
    const available_start = 0;
    const sheetName = '2024-08';
    const to_budget = 0;
    const errors: string[] = [];

    mockGetSheetValue.mockResolvedValueOnce(1000);

    // When
    const result = await goalsPercentage(
      template,
      month,
      available_start,
      sheetName,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(100);
    expect(result.errors).toHaveLength(0);
  });

  it('should calculate the budget based on a percentage of available funds', async () => {
    // Given
    const template = { percent: 10, category: 'available funds' };
    const month = '2024-08';
    const available_start = 1000;
    const sheetName = '2024-08';
    const to_budget = 0;
    const errors: string[] = [];

    // When
    const result = await goalsPercentage(
      template,
      month,
      available_start,
      sheetName,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(100);
    expect(result.errors).toHaveLength(0);
  });

  it('should calculate the budget based on a percentage of a specific income category for the current month', async () => {
    // Given
    const template = { percent: 10, category: 'Salary' };
    const month = '2024-08';
    const available_start = 0;
    const sheetName = '2024-08';
    const to_budget = 0;
    const errors: string[] = [];

    mockGetCategories.mockResolvedValueOnce([
      { id: 1, name: 'Salary', is_income: true },
    ]);
    mockGetSheetValue.mockResolvedValueOnce(1000);

    // When
    const result = await goalsPercentage(
      template,
      month,
      available_start,
      sheetName,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(100);
    expect(result.errors).toHaveLength(0);
  });

  it('should calculate the budget based on a percentage of a specific income category for the previous month', async () => {
    // Given
    const template = { percent: 10, category: 'Salary', previous: true };
    const month = '2024-08';
    const available_start = 0;
    const sheetName = '2024-08';
    const to_budget = 0;
    const errors: string[] = [];

    mockGetCategories.mockResolvedValueOnce([
      { id: 1, name: 'Salary', is_income: true },
    ]);
    mockGetSheetValue.mockResolvedValueOnce(1000);

    // When
    const result = await goalsPercentage(
      template,
      month,
      available_start,
      sheetName,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(100);
    expect(result.errors).toHaveLength(0);
  });

  it('should return an error if the specified income category does not exist', async () => {
    // Given
    const template = { percent: 10, category: 'NonExistentCategory' };
    const month = '2024-08';
    const available_start = 0;
    const sheetName = '2024-08';
    const to_budget = 0;
    const errors: string[] = [];

    mockGetCategories.mockResolvedValueOnce([
      { id: 1, name: 'Salary', is_income: true },
    ]);

    // When
    const result = await goalsPercentage(
      template,
      month,
      available_start,
      sheetName,
      to_budget,
      errors,
    );

    // Then
    expect(result.to_budget).toBe(0);
    expect(result.errors).toStrictEqual([
      'Could not find category “NonExistentCategory”',
    ]);
  });
});
