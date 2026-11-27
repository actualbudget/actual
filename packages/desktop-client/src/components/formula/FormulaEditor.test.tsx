import { useState } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { FormulaEditor } from './FormulaEditor';

// jsdom does not implement matchMedia, which FormulaEditor uses for the
// auto theme
window.matchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(() => false),
});

// jsdom does not implement Range layout APIs, which CodeMirror measures with
Range.prototype.getClientRects = () =>
  ({
    length: 0,
    item: () => null,
    [Symbol.iterator]: [][Symbol.iterator],
  }) as unknown as DOMRectList;
Range.prototype.getBoundingClientRect = () => new DOMRect();

function ControlledFormulaEditor({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <FormulaEditor
      mode="query"
      value={value}
      onChange={next => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('FormulaEditor timeframe picker', () => {
  test('uses the month picker for a year-month timeframe', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TestProviders>
        <ControlledFormulaEditor
          initialValue='=BUDGET_QUERY("spent", {"cat-a"}, "2026-01", "2026-03")'
          onChange={onChange}
        />
      </TestProviders>,
    );

    await user.click(await screen.findByText('2026-01'));
    expect(screen.queryByRole('grid')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'February 2027' }));

    expect(onChange.mock.calls).toEqual([
      ['=BUDGET_QUERY("spent", {"cat-a"}, "2027-02", "2026-03")'],
    ]);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
  });

  test('keeps the month-year format', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <TestProviders>
        <ControlledFormulaEditor
          initialValue='=BUDGET_QUERY("spent", {"cat-a"}, "2026-1", "3-2026")'
          onChange={onChange}
        />
      </TestProviders>,
    );

    await user.click(await screen.findByText('3-2026'));
    await user.click(screen.getByRole('button', { name: 'May 2026' }));

    expect(onChange.mock.calls).toEqual([
      ['=BUDGET_QUERY("spent", {"cat-a"}, "2026-1", "05-2026")'],
    ]);
  });
});
