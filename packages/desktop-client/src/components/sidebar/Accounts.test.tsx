import type { ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { AccountEntity } from 'loot-core/types/models';

import { Accounts } from './Accounts';

import { TestProvider } from '@desktop-client/redux/mock';

function makeAccount({
  id,
  name,
  offbudget,
  type = null,
}: {
  id: string;
  name: string;
  offbudget: 0 | 1;
  type?: string | null;
}): AccountEntity {
  return {
    id,
    name,
    type,
    offbudget,
    closed: 0,
    sort_order: 0,
    last_reconciled: null,
    tombstone: 0,
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
  };
}

const onBudgetAccountsMock = [
  makeAccount({ id: 'on-1', name: 'On Budget One', offbudget: 0 }),
];
const offBudgetAccountsMock = [
  makeAccount({ id: 'off-1', name: 'Off Budget One', offbudget: 1 }),
];
const accountsMock = [...onBudgetAccountsMock, ...offBudgetAccountsMock];

vi.mock('@desktop-client/hooks/useAccounts', () => ({
  useAccounts: () => accountsMock,
}));
vi.mock('@desktop-client/hooks/useOnBudgetAccounts', () => ({
  useOnBudgetAccounts: () => onBudgetAccountsMock,
}));
vi.mock('@desktop-client/hooks/useOffBudgetAccounts', () => ({
  useOffBudgetAccounts: () => offBudgetAccountsMock,
}));
vi.mock('@desktop-client/hooks/useClosedAccounts', () => ({
  useClosedAccounts: () => [],
}));
vi.mock('@desktop-client/hooks/useFailedAccounts', () => ({
  useFailedAccounts: () => new Set<string>(),
}));
vi.mock('@desktop-client/hooks/useUpdatedAccounts', () => ({
  useUpdatedAccounts: () => [],
}));
vi.mock('@desktop-client/hooks/useContextMenu', () => ({
  useContextMenu: () => ({
    setMenuOpen: vi.fn(),
    menuOpen: false,
    handleContextMenu: vi.fn(),
    position: {},
  }),
}));
vi.mock('@desktop-client/hooks/useLocalPref', async () => {
  const { useState } = await import('react');
  return {
    useLocalPref: (prefName: string) => {
      const [expandedKeys, setExpandedKeys] = useState<string[] | undefined>(
        undefined,
      );
      const [typeOrder, setTypeOrder] = useState<string[]>([]);
      const [other, setOther] = useState<unknown>(undefined);
      if (prefName === 'sidebar.expandedKeys') {
        return [expandedKeys, setExpandedKeys, vi.fn()] as const;
      }
      if (prefName === 'sidebar.typeOrder') {
        return [typeOrder, setTypeOrder, vi.fn()] as const;
      }
      return [other, setOther, vi.fn()] as const;
    },
  };
});

vi.mock('react-router', async () => {
  const actual = await import('react-router');
  return {
    ...actual,
    useMatch: () => null,
  };
});
vi.mock('@desktop-client/components/common/Link', () => ({
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock('@desktop-client/components/spreadsheet/CellValue', () => ({
  CellValue: () => <span data-testid="cell-value" />,
}));
vi.mock('./Account', () => ({
  Account: ({ name }: { name: string }) => <div>{name}</div>,
}));
vi.mock('@desktop-client/spreadsheet/bindings', () => ({
  allAccountBalance: vi.fn(() => 'binding'),
  onBudgetAccountBalance: vi.fn(() => 'binding'),
  offBudgetAccountBalance: vi.fn(() => 'binding'),
  closedAccountBalance: vi.fn(() => 'binding'),
  accountBalance: vi.fn(() => 'binding'),
}));

function getGroupToggleButton(label: string): HTMLButtonElement {
  const groupLabel = screen.getByText(label);
  const container =
    groupLabel.closest('[role="row"]') ?? groupLabel.parentElement;
  const button = container?.querySelector(
    'button[aria-label="Collapse"], button[aria-label="Expand"]',
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find toggle button for group: ${label}`);
  }
  return button;
}

describe('Accounts sidebar expansion', () => {
  test('allows collapsing and expanding structural groups', async () => {
    render(<Accounts />, { wrapper: TestProvider });
    const user = userEvent.setup();

    expect(screen.getByText('On Budget One')).toBeInTheDocument();
    expect(screen.getByText('Off Budget One')).toBeInTheDocument();

    await user.click(getGroupToggleButton('On budget'));
    await waitFor(() => {
      expect(screen.queryByText('On Budget One')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Off Budget One')).toBeInTheDocument();

    await user.click(getGroupToggleButton('On budget'));
    await waitFor(() => {
      expect(screen.getByText('On Budget One')).toBeInTheDocument();
    });
  });

  test('does not toggle previously toggled sibling groups', async () => {
    render(<Accounts />, { wrapper: TestProvider });
    const user = userEvent.setup();

    await user.click(getGroupToggleButton('On budget'));
    await waitFor(() => {
      expect(screen.queryByText('On Budget One')).not.toBeInTheDocument();
    });

    await user.click(getGroupToggleButton('Off budget'));
    await waitFor(() => {
      expect(screen.queryByText('Off Budget One')).not.toBeInTheDocument();
    });

    expect(screen.queryByText('On Budget One')).not.toBeInTheDocument();
  });
});
