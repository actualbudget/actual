import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { accountBalance } from '#spreadsheet/bindings';

import { BalanceRow, Highlight } from './primitives';

const privacy = vi.hoisted(() => ({ enabled: false, value: -12 }));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => [String(privacy.enabled), vi.fn()],
}));
vi.mock('#components/spreadsheet/CellValue', () => ({
  CellValue: ({
    children,
  }: {
    children: (props: { value: number }) => ReactNode;
  }) => children({ value: privacy.value }),
  CellValueText: ({ style }: { style: { color: string } }) => (
    <span data-testid="balance" style={{ color: style.color }} />
  ),
}));

describe('Highlight', () => {
  it.each(['', 'missing'])('leaves an unmatched query %j unchanged', query => {
    const { container } = render(<Highlight text="İx" query={query} />);
    expect(container.textContent).toBe('İx');
    expect(container.querySelector('span')).toBeNull();
  });

  it('maps lowercase expansions back to the original text', () => {
    const { container } = render(<Highlight text="İx" query="x" />);
    expect(container.textContent).toBe('İx');
    expect(container.querySelector('span')?.textContent).toBe('x');
  });

  it('highlights complete surrogate pairs without splitting them', () => {
    const { container } = render(<Highlight text="A😀B" query="😀" />);
    expect(container.textContent).toBe('A😀B');
    expect(container.querySelector('span')?.textContent).toBe('😀');
  });

  it('matches contextual lowercase forms as whole-string lowercase does', () => {
    const { container } = render(<Highlight text="ΟΣ" query="ς" />);
    expect(container.textContent).toBe('ΟΣ');
    expect(container.querySelector('span')?.textContent).toBe('Σ');
  });
});

describe('BalanceRow privacy colors', () => {
  it.each([-12, 12])(
    'uses a neutral color for a private balance of %s',
    value => {
      privacy.enabled = true;
      privacy.value = value;
      const html = renderToStaticMarkup(
        <BalanceRow<'account', 'balance'>
          label="Checking"
          binding={accountBalance('checking')}
          query=""
        />,
      );
      expect(html).toContain('var(--color-pageTextSubdued)');
      expect(html).not.toContain('var(--color-errorText)');
    },
  );

  it('keeps negative values red when privacy mode is disabled', () => {
    privacy.enabled = false;
    privacy.value = -12;
    const html = renderToStaticMarkup(
      <BalanceRow<'account', 'balance'>
        label="Checking"
        binding={accountBalance('checking')}
        query=""
      />,
    );
    expect(html).toContain('var(--color-errorText)');
  });
});
