import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useBudgetMonthCount } from './BudgetMonthCountContext';
import { MonthCountSelector } from './MonthCountSelector';

vi.mock('./BudgetMonthCountContext', () => ({
  useBudgetMonthCount: vi.fn(),
}));

describe('MonthCountSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when only one month fits on screen', () => {
    vi.mocked(useBudgetMonthCount).mockReturnValue({
      displayMax: 1,
      setDisplayMax: vi.fn(),
    });

    render(<MonthCountSelector maxMonths={1} onChange={vi.fn()} />);

    expect(
      screen.queryByTestId('month-count-selector'),
    ).not.toBeInTheDocument();
  });

  it('offers one option per month that fits and marks the current choice', async () => {
    vi.mocked(useBudgetMonthCount).mockReturnValue({
      displayMax: 3,
      setDisplayMax: vi.fn(),
    });
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<MonthCountSelector maxMonths={2} onChange={onChange} />);

    const group = screen.getByRole('group', { name: 'Months shown' });
    expect(group).toHaveTextContent('Months');
    expect(screen.getByRole('button', { name: '1 months' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByRole('button', { name: '2 months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: '3 months' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('never marks more months than fit on screen', () => {
    vi.mocked(useBudgetMonthCount).mockReturnValue({
      displayMax: 2,
      setDisplayMax: vi.fn(),
    });

    render(<MonthCountSelector maxMonths={6} onChange={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '2 months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
