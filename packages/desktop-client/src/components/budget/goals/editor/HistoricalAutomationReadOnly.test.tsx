import type { WeeklyAverageTemplate } from '@actual-app/core/types/models/templates';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { AmountAdjustment } from './AmountAdjustment';
import { HistoricalAutomationReadOnly } from './HistoricalAutomationReadOnly';

const template: WeeklyAverageTemplate = {
  type: 'weeklyAverage',
  numWeeks: 4,
  weekday: 'friday',
  adjustment: 5,
  adjustmentType: 'fixed',
  directive: 'template',
  priority: 1,
};

// A fixed adjustment on a weekly average is added once per week, so the UI
// has to say so; otherwise "$5" reads as $5 for the whole month.
describe('weekly average fixed adjustment', () => {
  it('describes the adjustment as per week', () => {
    render(<HistoricalAutomationReadOnly template={template} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText(/increased by .*5.* per week/)).toBeInTheDocument();
  });

  it('labels the adjustment field as per week', () => {
    render(<AmountAdjustment template={template} dispatch={vi.fn()} />, {
      wrapper: TestProviders,
    });

    expect(screen.getByText('Adjustment per week')).toBeInTheDocument();
  });
});
