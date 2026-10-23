import React from 'react';
import type { ComponentProps } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { Header } from './Header';

// The filter props form a discriminated union with the filterless variant, so
// drop them here: these tests never render filters.
type HeaderTestProps = Omit<
  ComponentProps<typeof Header>,
  | 'filters'
  | 'onApply'
  | 'onUpdateFilter'
  | 'onDeleteFilter'
  | 'conditionsOp'
  | 'onConditionsOpChange'
>;

// In test mode, monthUtils.currentMonth() returns '2017-01'
describe('Header', () => {
  const renderHeader = (props: Partial<HeaderTestProps> = {}) => {
    const onChangeDates = vi.fn();
    const headerProps: HeaderTestProps = {
      start: '2016-08',
      end: '2016-10',
      mode: 'static',
      allMonths: [{ name: '2017-01' }, { name: '2016-01' }],
      earliestTransaction: '2016-01-01',
      latestTransaction: '2017-01-01',
      onChangeDates,
      ...props,
    };
    render(
      <TestProviders>
        <Header {...headerProps} />
      </TestProviders>,
    );
    return { onChangeDates };
  };

  it('toggles between static and live without the until today mode', async () => {
    const user = userEvent.setup();
    const { onChangeDates } = renderHeader();

    await user.click(screen.getByRole('button', { name: 'Static' }));

    expect(onChangeDates).toBeCalledWith(
      '2016-11',
      '2017-01',
      'sliding-window',
    );
  });

  it('ends the range today while keeping the start when picking until today', async () => {
    const user = userEvent.setup();
    const { onChangeDates } = renderHeader({ showUntilTodayMode: true });

    await user.click(
      screen.getByRole('button', { name: 'Change date range mode' }),
    );
    await user.click(screen.getByRole('button', { name: 'Until today' }));

    expect(onChangeDates).toBeCalledWith('2016-08', '2017-01', 'until-today');
  });

  it('shows the until today mode as the current one', () => {
    renderHeader({
      mode: 'until-today',
      end: '2017-01',
      showUntilTodayMode: true,
    });

    expect(
      screen.getByRole('button', { name: 'Change date range mode' }),
    ).toHaveTextContent('Until today');
  });
});
