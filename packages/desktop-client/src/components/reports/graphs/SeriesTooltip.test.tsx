import type { ComponentProps } from 'react';

import type {
  IntervalEntity,
  LegendEntity,
  ReportValues,
} from '@actual-app/core/types/models';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TestProviders } from '#mocks';

import { SeriesTooltip } from './SeriesTooltip';

const legend: LegendEntity[] = [
  { name: 'Food', id: 'food', color: '#f00', dataKey: 'food' },
  { name: 'Fun', id: 'fun', color: '#0f0', dataKey: 'fun' },
];

function values(totalTotals: number): ReportValues {
  return {
    totalAssets: 0,
    totalDebts: totalTotals,
    totalTotals,
    netAssets: 0,
    netDebts: totalTotals,
    totalBudgeted: totalTotals,
  };
}

function makeInterval(
  fields: Partial<IntervalEntity>,
  series: Record<string, number | null>,
): IntervalEntity {
  return {
    date: 'Oct 2026',
    ...values(0),
    ...fields,
    ...series,
  };
}

function renderTooltip(
  interval: IntervalEntity,
  props: Partial<ComponentProps<typeof SeriesTooltip>> = {},
) {
  const { container } = render(
    <TestProviders>
      <SeriesTooltip
        active
        payload={[{ payload: interval }]}
        legend={legend}
        format={value => String(value)}
        balanceTypeOp="totalAssets"
        compact={false}
        hoveredKey=""
        order="value"
        {...props}
      />
    </TestProviders>,
  );
  return container.textContent;
}

describe('SeriesTooltip', () => {
  it('lists each series and their total without a comparison', () => {
    expect(renderTooltip(makeInterval({}, { food: -80, fun: -20 }))).toBe(
      'Oct 2026Fun-20Food-80Total-100',
    );
  });

  it('lists each amount beside its change from the comparison', () => {
    const interval = makeInterval(
      { comparison: { expected: values(-150), actual: values(-100) } },
      {
        food: -80,
        'food:amount': -80,
        'food:change': 40,
        fun: -20,
        'fun:amount': -20,
        'fun:change': -10,
        'food:comparison': -120,
        'fun:comparison': -30,
      },
    );

    expect(renderTooltip(interval)).toBe(
      'Oct 2026Amountvs comparisonFun-20-10Food-80+40' +
        'Comparison-150Total-100+30',
    );
  });

  it('lists only the comparison for intervals that have not started', () => {
    const interval = makeInterval(
      {
        comparison: {
          expected: values(0),
          actual: values(0),
          upcoming: values(-150),
        },
      },
      {
        food: null,
        'food:amount': null,
        'food:comparison': -120,
        fun: null,
        'fun:amount': null,
        'fun:comparison': -30,
      },
    );

    expect(renderTooltip(interval)).toBe(
      'Oct 2026ComparisonFun-30Food-120Comparison-150',
    );
  });
});
