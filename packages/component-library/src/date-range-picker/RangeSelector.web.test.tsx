import { render, screen } from '@testing-library/react';

import { RangeSelector } from './RangeSelector';

const defaultProps = {
  min: '2020-01',
  max: '2030-12',
  locale: 'en-US',
  labels: { previous: 'Previous', next: 'Next' },
  onChange: () => {},
};

describe('RangeSelector', () => {
  it('jumps the shown year to a range set from outside it', () => {
    const { rerender } = render(
      <RangeSelector {...defaultProps} start="2025-01" end="2025-06" />,
    );
    expect(screen.getByText('2025')).toBeTruthy();

    // e.g. a quick-select preset picks a range in another year
    rerender(<RangeSelector {...defaultProps} start="2026-05" end="2026-07" />);
    expect(screen.getByText('2026')).toBeTruthy();
  });

  it('keeps the shown year when it already touches the new range', () => {
    const { rerender } = render(
      <RangeSelector {...defaultProps} start="2025-01" end="2025-06" />,
    );
    rerender(<RangeSelector {...defaultProps} start="2024-05" end="2025-03" />);
    expect(screen.getByText('2025')).toBeTruthy();
  });

  it('marks an external reference month as current', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T12:00:00Z'));
    try {
      render(
        <RangeSelector
          {...defaultProps}
          start="2026-05"
          end="2026-05"
          referenceMonth="2026-08"
        />,
      );

      expect(
        screen
          .getByRole('button', { name: 'August 2026' })
          .getAttribute('aria-current'),
      ).toBe('date');

      expect(
        screen
          .getByRole('button', { name: 'May 2026' })
          .getAttribute('aria-current'),
      ).toBe('date');
    } finally {
      vi.useRealTimers();
    }
  });
});
