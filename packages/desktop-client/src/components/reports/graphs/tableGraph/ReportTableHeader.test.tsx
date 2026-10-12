import { createRef } from 'react';
import type { ComponentProps } from 'react';

import type { IntervalEntity } from '@actual-app/core/types/models';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { ReportTableHeader } from './ReportTableHeader';

function makeInterval(date: string): IntervalEntity {
  return {
    date,
    totalAssets: 0,
    totalDebts: 0,
    netAssets: 0,
    netDebts: 0,
    totalTotals: 0,
    totalBudgeted: 0,
  };
}

function renderHeader(
  props: Partial<ComponentProps<typeof ReportTableHeader>>,
) {
  const { container } = render(
    <TestProviders>
      <ReportTableHeader
        headerScrollRef={createRef()}
        handleScroll={vi.fn()}
        data={[makeInterval('May 2026'), makeInterval('Jun 2026')]}
        groupBy="Category"
        interval="Monthly"
        balanceTypeOp="totalTotals"
        compact={false}
        mode="total"
        {...props}
      />
    </TestProviders>,
  );
  return container.textContent;
}

describe('ReportTableHeader', () => {
  it('shows real amounts then the projection and change in total mode', () => {
    expect(renderHeader({ showBaseline: true, showProjected: true })).toBe(
      'CategoryBaselineDepositsPaymentsTotalsProjectedChangeAverage',
    );
  });

  it('shows changes per interval in time mode', () => {
    expect(
      renderHeader({ mode: 'time', showBaseline: true, showProjected: true }),
    ).toBe('CategoryBaselineMay 2026Jun 2026ProjectedTotalsAverage');
  });

  it('leaves the columns unchanged without a baseline', () => {
    expect(renderHeader({})).toBe('CategoryDepositsPaymentsTotalsAverage');
  });
});
