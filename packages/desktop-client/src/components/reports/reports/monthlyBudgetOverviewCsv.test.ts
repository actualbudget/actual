import { getLocale } from '@actual-app/core/shared/locale';
import { describe, expect, it } from 'vitest';

import { exportMonthlyBudgetOverviewCsv } from './monthlyBudgetOverviewCsv';

describe('exportMonthlyBudgetOverviewCsv', () => {
  it('exports category rows and summary totals', () => {
    const csv = exportMonthlyBudgetOverviewCsv(
      {
        startMonth: '2024-01',
        endMonth: '2024-01',
        monthCount: 1,
        totals: {
          carriedOver: 1000,
          needed: 20000,
          budgeted: 15000,
          remaining: 5000,
          overfunded: 0,
        },
        groups: [
          {
            groupId: 'g1',
            groupName: 'Monthly Bills',
            subtotal: {
              carriedOver: 1000,
              needed: 20000,
              budgeted: 15000,
              remaining: 5000,
              overfunded: 0,
            },
            categories: [
              {
                categoryId: 'c1',
                categoryName: 'Groceries',
                carriedOver: 1000,
                needed: 20000,
                budgeted: 15000,
                remaining: 5000,
                overfunded: 0,
              },
            ],
          },
        ],
      },
      { locale: getLocale('en-US') },
    );

    expect(csv).toContain(
      'Category group,Category,Carried over,Projected,Budgeted,Funding status',
    );
    expect(csv).toContain('Monthly Bills,,10.00,200.00,150.00,-50.00');
    expect(csv).toContain('Monthly Bills,Groceries,10.00,200.00,150.00,-50.00');
    expect(csv).toContain('Total projected,,,200.00');
    expect(csv).toContain('Goals underfunded,,,-50.00');
  });
});
