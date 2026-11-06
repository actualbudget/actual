import type { ForecastAssumptions } from '@actual-app/core/types/models/forecast';
import { fireEvent, render, screen } from '@testing-library/react';

import { ForecastAssumptionsControls } from './ForecastAssumptionsControls';

vi.mock('#hooks/useSchedules', () => ({
  useSchedules: () => ({ schedules: [], isLoading: false }),
}));
vi.mock('#hooks/usePayees', () => ({
  usePayeesById: () => ({ data: {} }),
}));

describe('ForecastAssumptionsControls', () => {
  it('reopens saved rates without floating-point noise or changing them on apply', () => {
    const assumptions: ForecastAssumptions = {
      anchorDate: '2017-01-01',
      inflationRate: 0.07,
      salaryGrowthRate: 0.29,
      incomeScheduleIds: [],
    };
    const onApply = vi.fn();
    render(
      <ForecastAssumptionsControls
        assumptions={assumptions}
        source="schedules"
        onApply={onApply}
      />,
    );

    expect(screen.getByLabelText('Annual inflation (%)')).toHaveValue(7);
    expect(screen.getByLabelText('Annual salary growth (%)')).toHaveValue(29);
    fireEvent.click(screen.getByRole('button', { name: 'Apply assumptions' }));
    expect(onApply).toHaveBeenLastCalledWith(assumptions);
  });

  it('keeps zero rates by default', () => {
    render(
      <ForecastAssumptionsControls source="schedules" onApply={vi.fn()} />,
    );

    expect(screen.getByLabelText('Annual inflation (%)')).toHaveValue(0);
    expect(screen.getByLabelText('Annual salary growth (%)')).toHaveValue(0);
    expect(
      screen.getByRole('checkbox', { name: 'Compare with assumptions' }),
    ).not.toBeChecked();
  });
});
