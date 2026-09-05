import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { envelopeBudget } from '#spreadsheet/bindings';

import { ToBudgetMenu } from './ToBudgetMenu';

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: vi.fn(),
}));

vi.mock('#components/budget/envelope/EnvelopeBudgetComponents', () => ({
  useEnvelopeSheetValue: vi.fn(),
}));

vi.mock('@actual-app/components/menu', () => ({
  Menu: ({ items }: { items: Array<{ name: string; text: ReactNode }> }) => (
    <div>
      {items.map(item => (
        <div key={item.name}>{item.text}</div>
      ))}
    </div>
  ),
}));

it('preserves the existing To Budget actions when the preference is absent', () => {
  vi.mocked(useSyncedPref).mockReturnValue([undefined, vi.fn()]);
  vi.mocked(useEnvelopeSheetValue).mockImplementation(binding => {
    if (binding === envelopeBudget.toBudget) {
      return 100;
    }
    return 0;
  });

  render(
    <ToBudgetMenu
      month="2026-09"
      onTransfer={vi.fn()}
      onCover={vi.fn()}
      onHoldBuffer={vi.fn()}
      onResetHoldBuffer={vi.fn()}
    />,
  );

  expect(useEnvelopeSheetValue).toHaveBeenCalledWith(envelopeBudget.toBudget);
  expect(screen.getByText('Move to a category')).toBeInTheDocument();
  expect(screen.getByText('Hold for next month')).toBeInTheDocument();
});
