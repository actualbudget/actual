import type { ReactNode } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';

import { createTestAppStore, TestProviders } from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { EnvelopeBudgetMenuModal } from './EnvelopeBudgetMenuModal';
import { TrackingBudgetMenuModal } from './TrackingBudgetMenuModal';

vi.mock('#components/common/Modal', () => ({
  Modal: ({
    children,
  }: {
    children: (state: { state: { close: () => void } }) => ReactNode;
  }) => children({ state: { close: vi.fn() } }),
  ModalHeader: () => null,
  ModalCloseButton: () => null,
  ModalTitle: () => null,
}));
vi.mock('#components/budget/envelope/EnvelopeBudgetComponents', () => ({
  useEnvelopeSheetValue: () => 1234,
}));
vi.mock('#components/budget/tracking/TrackingBudgetComponents', () => ({
  useTrackingSheetValue: () => 1234,
}));
vi.mock('#hooks/useCategory', () => ({
  useCategory: () => ({ data: { id: 'category', name: 'Category' } }),
}));
vi.mock('#hooks/useNotes', () => ({ useNotes: () => '' }));

it.each([
  ['envelope', false],
  ['envelope', true],
  ['tracking', false],
  ['tracking', true],
] as const)(
  'saves %s budget input with calculator %s at 3dp',
  (kind, calculator) => {
    const store = createTestAppStore();
    store.dispatch(
      mergeSyncedPrefs({
        amountEncoding: JSON.stringify({
          version: 1,
          currencyCode: 'KWD',
          precision: 3,
        }),
        'flags.mobileCalculator': String(calculator),
      }),
    );
    const onUpdateBudget = vi.fn();
    const props = {
      categoryId: 'category',
      month: '2026-09',
      onUpdateBudget,
      onCopyLastMonthAverage: vi.fn(),
      onSetMonthsAverage: vi.fn(),
      onApplyBudgetTemplate: vi.fn(),
      onEditNotes: vi.fn(),
    };
    render(
      <TestProviders store={store}>
        {kind === 'envelope' ? (
          <EnvelopeBudgetMenuModal {...props} />
        ) : (
          <TrackingBudgetMenuModal {...props} onCopyUntilYearEnd={vi.fn()} />
        )}
      </TestProviders>,
    );
    const input = screen.getByTestId('amount-input');
    fireEvent.change(input, {
      target: { value: calculator ? '2.345' : '2345' },
    });
    fireEvent.blur(input);
    expect(onUpdateBudget).toHaveBeenLastCalledWith(2345);
  },
);
