import type { ReactNode } from 'react';
import { HotkeysProvider } from 'react-hotkeys-hook';

import { initServer } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { fireEvent, render, screen } from '@testing-library/react';

import { accountQueries } from '#accounts';
import { EnvelopeBudgetSummaryModal } from '#components/modals/EnvelopeBudgetSummaryModal';
import { SheetNameProvider } from '#hooks/useSheetName';
import {
  createTestAppStore,
  createTestQueryClient,
  TestProviders,
} from '#mocks';
import { mergeSyncedPrefs } from '#prefs/prefsSlice';

import { ToBudget } from './ToBudget';
import { ToBudgetAmount } from './ToBudgetAmount';
import { TotalsList } from './TotalsList';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);
// The tooltip portal is irrelevant to the arithmetic; expose its real contents.
vi.mock('@actual-app/components/tooltip', () => ({
  Tooltip: ({
    children,
    content,
  }: {
    children: ReactNode;
    content: ReactNode;
  }) => (
    <div>
      {children}
      <aside>{content}</aside>
    </div>
  ),
}));
const cells: Record<string, number | boolean> = {};
vi.mock('#hooks/useSpreadsheet', () => ({
  useSpreadsheet: () => ({
    bind: (
      sheet: string,
      binding: string | { name: string },
      cb: (node: { name: string; value: number | boolean }) => void,
    ) => {
      const name = typeof binding === 'string' ? binding : binding.name;
      cb({ name: `${sheet}!${name}`, value: cells[name] ?? 0 });
      return () => undefined;
    },
  }),
}));
const plain = (s: string) => (content: string) =>
  content.replace(/[\u202a\u202c]/g, '') === s;
function setup(fx = 6500, incomplete = false, foreign = true) {
  Object.assign(cells, {
    'fx-changes': fx,
    'fx-incomplete': incomplete,
    'total-income': 20000,
    'from-last-month': 10000,
    'available-funds': 30000 + fx,
  });
  const store = createTestAppStore();
  store.dispatch(
    mergeSyncedPrefs({
      defaultCurrencyCode: 'USD',
      'flags.multicurrency': 'false',
      'flags.currency': 'false',
    }),
  );
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    accountQueries.list().queryKey,
    foreign
      ? [
          {
            id: 'yen',
            name: 'Yen',
            offbudget: 0,
            closed: 1,
            currency: 'JPY',
            currency_precision: 0,
            sort_order: 0,
            tombstone: 0,
            account_group_id: null,
            last_reconciled: null,
            account_id: null,
            bank: null,
            bankName: null,
            bankId: null,
            mask: null,
            official_name: null,
            balance_current: null,
            balance_available: null,
            balance_limit: null,
            account_sync_source: null,
            last_sync: null,
            bank_sync_status: null,
          } satisfies AccountEntity,
        ]
      : [],
  );
  const read = vi.fn();
  initServer({ 'budget/fx-valuation': read });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders store={store} queryClient={queryClient}>
      <SheetNameProvider name="envelope-budget201612">
        {children}
      </SheetNameProvider>
    </TestProviders>
  );
  return { wrapper, store, read };
}

it.each([6500, -6500])(
  'explains included FX %s as a subordinate ordinary amount and the third subtotal term',
  fx => {
    const { wrapper } = setup(fx);
    render(<TotalsList month="2016-12" prevMonthName="Nov" />, { wrapper });
    expect(screen.getByText('FX changes (included)')).toBeVisible();
    expect(screen.getByText('FX changes:')).toBeVisible();
    expect(
      screen.getAllByText(plain(fx > 0 ? '$65.00' : '-$65.00')),
    ).toHaveLength(2);
    expect(
      screen.getByText(plain(fx > 0 ? '$365.00' : '$235.00')),
    ).toBeVisible();
    expect(screen.getByText(plain('$200.00'))).toBeVisible();
    expect(screen.getByText(plain('$100.00'))).toBeVisible();
    expect(screen.getByRole('button', { name: 'FX details' })).toBeVisible();
  },
);

it('keeps the explanation with flags off and a closed foreign account, even at zero', () => {
  const { wrapper } = setup(0);
  render(<TotalsList month="2016-12" prevMonthName="Nov" />, { wrapper });
  expect(screen.getByText('FX changes (included)')).toBeVisible();
});
it('omits the FX row in a true base-only budget', () => {
  const { wrapper } = setup(0, false, false);
  render(<TotalsList month="2016-12" prevMonthName="Nov" />, { wrapper });
  expect(screen.queryByText('FX changes (included)')).toBeNull();
});
it('marks incomplete cells even with no foreign account and starts no bridge reads for multiple months', () => {
  const { wrapper, read } = setup(0, true, false);
  render(
    <>
      <TotalsList month="2016-12" prevMonthName="Nov" />
      <TotalsList month="2017-01" prevMonthName="Dec" interactive={false} />
    </>,
    { wrapper },
  );
  expect(screen.getAllByText('Valuation incomplete')).toHaveLength(2);
  expect(
    screen.getAllByText(
      'Some holdings could not be valued. Their unavailable amounts are left out of FX changes.',
    ),
  ).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'FX details' })).toHaveLength(1);
  expect(read).not.toHaveBeenCalled();
});
it.each(['Enter', ' '])(
  'opens the To Budget menu with keyboard %s and leaves the tooltip display only',
  key => {
    const { wrapper } = setup();
    const onClick = vi.fn();
    render(
      <ToBudgetAmount month="2016-12" prevMonthName="Nov" onClick={onClick} />,
      { wrapper },
    );
    const trigger = screen.getByRole('button', {
      name: plain('To Budget menu: $0.00'),
    });
    expect(trigger).toHaveAttribute('tabindex', '0');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    fireEvent.keyDown(trigger, { key });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'FX details' })).toBeNull();
  },
);

it('names the To Budget trigger with its amount, but not in privacy mode', () => {
  const { wrapper, store } = setup();
  cells['to-budget'] = -1250;
  onTestFinished(() => {
    delete cells['to-budget'];
  });
  const view = render(
    <ToBudgetAmount month="2016-12" prevMonthName="Nov" onClick={vi.fn()} />,
    { wrapper },
  );
  expect(
    screen.getByRole('button', { name: plain('To Budget menu: -$12.50') }),
  ).toBeVisible();
  store.dispatch(mergeSyncedPrefs({ isPrivacyEnabled: 'true' }));
  view.rerender(
    <ToBudgetAmount month="2016-12" prevMonthName="Nov" onClick={vi.fn()} />,
  );
  expect(
    screen.getByRole('button', { name: 'To Budget menu' }),
  ).toHaveAttribute('aria-haspopup', 'menu');
});

it('opens details for the explicit selected month from the expanded shared summary', () => {
  const { wrapper, store } = setup();
  render(<TotalsList month="2017-01" prevMonthName="Dec" />, { wrapper });
  fireEvent.click(screen.getByRole('button', { name: 'FX details' }));
  expect(store.getState().modals.modalStack.at(-1)).toMatchObject({
    name: 'fx-valuation',
    options: { month: '2017-01' },
  });
});

it('closes the collapsed desktop menu before opening details', () => {
  const { wrapper, store } = setup();
  render(
    <ToBudget
      month="2016-12"
      prevMonthName="Nov"
      onBudgetAction={vi.fn()}
      isCollapsed
    />,
    { wrapper },
  );
  fireEvent.keyDown(
    screen.getByRole('button', { name: plain('To Budget menu: $0.00') }),
    { key: 'Enter' },
  );
  fireEvent.click(screen.getByRole('button', { name: 'FX details' }));
  expect(screen.queryByRole('button', { name: 'FX details' })).toBeNull();
  expect(store.getState().modals.modalStack.at(-1)).toMatchObject({
    name: 'fx-valuation',
    options: { month: '2016-12' },
  });
});

it('uses the existing mobile summary and opens the same details modal', () => {
  const { wrapper, store } = setup();
  render(
    <HotkeysProvider>
      <EnvelopeBudgetSummaryModal
        month="2016-12"
        onBudgetAction={vi.fn().mockResolvedValue(undefined)}
      />
    </HotkeysProvider>,
    { wrapper },
  );
  expect(screen.getAllByText('FX changes (included)').length).toBeGreaterThan(
    0,
  );
  fireEvent.click(screen.getByRole('button', { name: 'FX details' }));
  expect(store.getState().modals.modalStack.at(-1)).toMatchObject({
    name: 'fx-valuation',
    options: { month: '2016-12' },
  });
});
