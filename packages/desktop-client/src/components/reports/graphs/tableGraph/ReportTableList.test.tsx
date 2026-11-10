import React from 'react';

import type { DataEntity, IntervalEntity } from '@actual-app/core/types/models';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { ReportTableList } from './ReportTableList';

function makeInterval(
  date: string,
  intervalStartDate: string,
  intervalEndDate: string,
): IntervalEntity {
  return {
    date,
    intervalStartDate,
    intervalEndDate,
    totalAssets: 0,
    totalDebts: 0,
    netAssets: 0,
    netDebts: 0,
    totalTotals: 0,
    totalBudgeted: 0,
  };
}

describe('ReportTableList', () => {
  it('passes each interval date range to its row when split by interval', () => {
    const renderRow = vi.fn(() => null);
    const data: DataEntity = {
      intervalData: [
        makeInterval('May 2026', '2026-05-01', '2026-05-31'),
        makeInterval('Jun 2026', '2026-06-01', '2026-06-30'),
      ],
      totalAssets: 0,
      totalDebts: 0,
      netAssets: 0,
      netDebts: 0,
      totalTotals: 0,
      totalBudgeted: 0,
    };

    render(
      <TestProviders>
        <ReportTableList
          data={data}
          mode="total"
          groupBy="Interval"
          renderRow={renderRow}
        />
      </TestProviders>,
    );

    expect(renderRow).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          intervalData: [
            expect.objectContaining({
              intervalStartDate: '2026-05-01',
              intervalEndDate: '2026-05-31',
            }),
          ],
        }),
      }),
    );
    expect(renderRow).toHaveBeenCalledWith(
      expect.objectContaining({
        item: expect.objectContaining({
          intervalData: [
            expect.objectContaining({
              intervalStartDate: '2026-06-01',
              intervalEndDate: '2026-06-30',
            }),
          ],
        }),
      }),
    );
  });
});
