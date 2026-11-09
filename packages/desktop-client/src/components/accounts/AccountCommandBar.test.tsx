import { useEffect } from 'react';
import type { ReactNode, RefObject } from 'react';

import { generateAccount } from '@actual-app/core/mocks';
import type { AccountEntity } from '@actual-app/core/types/models';
import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CommandBarProvider,
  useCommandBarCommands,
} from '#commandbar/commandBarRegistry';
import type { CommandBarCommand } from '#commandbar/commandBarRegistry';
import type { FilterButtonHandle } from '#components/filters/FiltersMenu';

import {
  AccountCommandBar,
  createAccountCommandBarCommands,
  isEligibleAccountPage,
} from './AccountCommandBar';

vi.mock('#hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false,
}));

function makeAccount(id: string, closed = false): AccountEntity {
  return {
    ...generateAccount('Checking'),
    id,
    closed: closed ? 1 : 0,
  };
}

function makeLabels() {
  return {
    addNew: 'Add New',
    importTransactions: 'Import',
    filter: 'Filter',
    expandSplits: 'Expand split transactions',
    collapseSplits: 'Collapse split transactions',
    showBalanceChart: 'Show balance chart',
    hideBalanceChart: 'Hide balance chart',
    manageTableColumns: 'Manage table columns',
    showReconciledTransactions: 'Show reconciled transactions',
    hideReconciledTransactions: 'Hide reconciled transactions',
    exportTransactions: 'Export',
    closeAccount: 'Close account',
    accountGroup: 'Set account group',
  };
}

function CommandsObserver({
  onCommands,
}: {
  onCommands: (commands: readonly CommandBarCommand[]) => void;
}) {
  const commands = useCommandBarCommands();

  useEffect(() => onCommands(commands), [commands, onCommands]);

  return null;
}

function Provider({ children }: { children: ReactNode }) {
  return <CommandBarProvider>{children}</CommandBarProvider>;
}

function makeCommandOptions(overrides = {}) {
  const filterButtonRef = {
    current: { open: vi.fn() },
  } satisfies RefObject<FilterButtonHandle | null>;
  const onAddTransaction = vi.fn();
  const onImport = vi.fn();
  const onToggleSplits = vi.fn();
  const onMenuSelect = vi.fn();

  return {
    filterButtonRef,
    splitMode: 'expand' as const,
    showNetWorthChart: false,
    showReconciled: false,
    onAddTransaction,
    onImport,
    onToggleSplits,
    onMenuSelect,
    labels: makeLabels(),
    showAccountGroup: false,
    ...overrides,
  };
}

describe('AccountCommandBar', () => {
  it('registers active account actions in the requested order', () => {
    const account = makeAccount('checking');
    const onCommands = vi.fn();

    render(
      <Provider>
        <AccountCommandBar
          {...makeCommandOptions()}
          account={account}
          accountId="checking"
        />
        <CommandsObserver onCommands={onCommands} />
      </Provider>,
    );

    expect(onCommands).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining('account-page:checking'),
        }),
      ]),
    );
    expect(
      onCommands.mock.lastCall?.[0].map(
        (command: CommandBarCommand) => command.label,
      ),
    ).toEqual([
      'Add New',
      'Import',
      'Filter',
      'Expand split transactions',
      'Show balance chart',
      'Manage table columns',
      'Show reconciled transactions',
      'Export',
      'Close account',
    ]);
    expect(
      onCommands.mock.lastCall?.[0]
        .filter((command: CommandBarCommand) => command.destructive)
        .map((command: CommandBarCommand) => command.label),
    ).toEqual(['Close account']);
  });

  it.each([
    ['missing account', undefined, 'checking'],
    ['closed account', makeAccount('checking', true), 'checking'],
    ['special view', makeAccount('onbudget'), 'onbudget'],
    ['different account', makeAccount('savings'), 'checking'],
  ])(
    'does not register actions for an ineligible %s',
    (_name, account, accountId) => {
      const onCommands = vi.fn();

      render(
        <Provider>
          <AccountCommandBar
            {...makeCommandOptions()}
            account={account}
            accountId={accountId}
          />
          <CommandsObserver onCommands={onCommands} />
        </Provider>,
      );

      expect(onCommands).toHaveBeenLastCalledWith([]);
    },
  );

  it('recognizes only real, open account pages', () => {
    expect(isEligibleAccountPage('checking', makeAccount('checking'))).toBe(
      true,
    );
    expect(
      isEligibleAccountPage('checking', makeAccount('checking', true)),
    ).toBe(false);
    expect(isEligibleAccountPage('onbudget', makeAccount('onbudget'))).toBe(
      false,
    );
    expect(isEligibleAccountPage(undefined, makeAccount('checking'))).toBe(
      false,
    );
  });

  it('uses live state for dynamic labels', () => {
    const options = makeCommandOptions();
    const initial = createAccountCommandBarCommands(options);
    const updated = createAccountCommandBarCommands({
      ...options,
      splitMode: 'collapse',
      showNetWorthChart: true,
      showReconciled: true,
    });

    expect(initial.map(command => command.label).slice(3, 7)).toEqual([
      'Expand split transactions',
      'Show balance chart',
      'Manage table columns',
      'Show reconciled transactions',
    ]);
    expect(updated.map(command => command.label).slice(3, 7)).toEqual([
      'Collapse split transactions',
      'Hide balance chart',
      'Manage table columns',
      'Hide reconciled transactions',
    ]);
  });

  it('registers account groups only when the sidebar feature is enabled', () => {
    const options = makeCommandOptions();

    expect(
      createAccountCommandBarCommands(options).map(command => command.id),
    ).not.toContain('account-group');
    expect(
      createAccountCommandBarCommands({
        ...options,
        showAccountGroup: true,
      }).map(command => command.label),
    ).toEqual([
      'Add New',
      'Import',
      'Filter',
      'Expand split transactions',
      'Show balance chart',
      'Manage table columns',
      'Set account group',
      'Show reconciled transactions',
      'Export',
      'Close account',
    ]);
  });

  it('delegates actions to existing account handlers and filter handle', () => {
    const options = makeCommandOptions();
    const commands = createAccountCommandBarCommands(options);

    act(() => {
      for (const command of commands) {
        command.execute();
      }
    });

    expect(options.onAddTransaction).toHaveBeenCalledTimes(1);
    expect(options.onImport).toHaveBeenCalledTimes(1);
    expect(options.filterButtonRef.current.open).toHaveBeenCalledTimes(1);
    expect(options.onToggleSplits).toHaveBeenCalledTimes(1);
    expect(options.onMenuSelect.mock.calls).toEqual([
      ['toggle-net-worth-chart'],
      ['manage-columns'],
      ['toggle-reconciled'],
      ['export'],
      ['close'],
    ]);
  });

  it('only delegates close to the existing confirmation action', () => {
    const options = makeCommandOptions();
    const closeCommand = createAccountCommandBarCommands(options).find(
      command => command.id === 'close',
    );

    act(() => {
      closeCommand?.execute();
    });

    expect(options.onMenuSelect).toHaveBeenCalledWith('close');
    expect(options.onAddTransaction).not.toHaveBeenCalled();
    expect(options.onImport).not.toHaveBeenCalled();
  });

  it('delegates account groups to the existing menu handler', () => {
    const options = makeCommandOptions({ showAccountGroup: true });
    const command = createAccountCommandBarCommands(options).find(
      command => command.id === 'account-group',
    );

    act(() => command?.execute());

    expect(options.onMenuSelect).toHaveBeenCalledWith('account-group');
  });
});
