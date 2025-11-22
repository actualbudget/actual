import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { generateAccount } from 'loot-core/mocks';
import { q } from 'loot-core/shared/query';
import { type AccountEntity } from 'loot-core/types/models';

import { ReconcilingMessage, ReconcileMenu } from './Reconcile';

import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { TestProvider } from '@desktop-client/redux/mock';

vi.mock('@desktop-client/hooks/useSheetValue', () => ({
  useSheetValue: vi.fn(),
}));

// Use actual arithmetic and util functions for real math behavior
// (we rely on default decimalPlaces=2 semantics for integer amounts)

describe('ReconcilingMessage math & UI', () => {
  // useSheetValue is mocked above via relative path

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeBalanceQuery() {
    return {
      name: 'balance-query-test' as const,
      query: q('transactions'),
    };
  }

  test('shows "All reconciled!" when target matches cleared', async () => {
    vi.mocked(useSheetValue).mockReturnValue(5000);

    const onDone = vi.fn();
    const onCreateTransaction = vi.fn();

    render(
      <TestProvider>
        <ReconcilingMessage
          balanceQuery={makeBalanceQuery()}
          targetBalance={5000}
          onDone={onDone}
          onCreateTransaction={onCreateTransaction}
        />
      </TestProvider>,
    );

    expect(screen.getByText('All reconciled!')).toBeInTheDocument();
    // No reconciliation transaction button when diff is zero
    expect(
      screen.queryByText('Create reconciliation transaction'),
    ).not.toBeInTheDocument();

    // Done button triggers callback
    await userEvent.click(screen.getByText('Lock transactions'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('computes positive difference and passes correct amount', async () => {
    // cleared = 30.00, bank = 100.00 => diff = +70.00
    vi.mocked(useSheetValue).mockReturnValue(3000);
    const onCreateTransaction = vi.fn();

    render(
      <TestProvider>
        <ReconcilingMessage
          balanceQuery={makeBalanceQuery()}
          targetBalance={10000}
          onDone={() => {}}
          onCreateTransaction={onCreateTransaction}
        />
      </TestProvider>,
    );

    // Formatted amounts present
    expect(screen.getByText('30.00')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    // Positive diff shows plus sign
    expect(screen.getByText('+70.00')).toBeInTheDocument();

    await userEvent.click(
      screen.getByText('Create reconciliation transaction'),
    );
    expect(onCreateTransaction).toHaveBeenCalledWith(7000);
  });

  test('computes negative difference and passes correct amount', async () => {
    // cleared = 120.00, bank = 100.00 => diff = -20.00
    vi.mocked(useSheetValue).mockReturnValue(12000);
    const onCreateTransaction = vi.fn();

    render(
      <TestProvider>
        <ReconcilingMessage
          balanceQuery={makeBalanceQuery()}
          targetBalance={10000}
          onDone={() => {}}
          onCreateTransaction={onCreateTransaction}
        />
      </TestProvider>,
    );

    expect(screen.getByText('120.00')).toBeInTheDocument();
    expect(screen.getByText('100.00')).toBeInTheDocument();
    expect(screen.getByText('-20.00')).toBeInTheDocument();

    await userEvent.click(
      screen.getByText('Create reconciliation transaction'),
    );
    expect(onCreateTransaction).toHaveBeenCalledWith(-2000);
  });
});

describe('ReconcileMenu arithmetic evaluation', () => {
  // useSheetValue is mocked above via relative path

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Create a valid offline account entity
  const baseAccount: AccountEntity = generateAccount('Checking', false, false);

  test('defaults input to cleared balance and submits evaluated integer amount', async () => {
    // clearedBalance = 123.45
    vi.mocked(useSheetValue).mockReturnValue(12345);
    const onReconcile = vi.fn();
    const onClose = vi.fn();

    render(
      <TestProvider>
        <ReconcileMenu
          account={baseAccount as AccountEntity}
          onReconcile={onReconcile}
          onClose={onClose}
        />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    // Replace with arithmetic expression
    await userEvent.clear(input);
    await userEvent.type(input, '100+25.50-10');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: 'Reconcile' }));

    // 100 + 25.50 - 10 = 115.50 -> 11550 integer
    expect(onReconcile).toHaveBeenCalledWith(11550);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('defaults input to cleared balance and submits evaluated invalid amount & use cleared balance', async () => {
    // clearedBalance = 1234.56
    vi.mocked(useSheetValue).mockReturnValue(123456);
    const onReconcile = vi.fn();
    const onClose = vi.fn();

    render(
      <TestProvider>
        <ReconcileMenu
          account={baseAccount as AccountEntity}
          onReconcile={onReconcile}
          onClose={onClose}
        />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    // Replace with arithmetic expression
    await userEvent.clear(input);
    await userEvent.type(input, '100+25.50-abcd-10');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: 'Reconcile' }));

    // Input contains invalid characters, so it should use cleared balance for reconciliation
    expect(onReconcile).toHaveBeenCalledWith(123456);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('clicking "Use last synced total" fills and submits that amount', async () => {
    // clearedBalance present so input renders
    vi.mocked(useSheetValue).mockReturnValue(1000);

    const onReconcile = vi.fn();
    const onClose = vi.fn();

    // Ensure the account is the connected variant so balance_current is a number
    const connectedAccount = generateAccount(
      'Checking',
      true,
      false,
    ) as AccountEntity;
    connectedAccount.balance_current = 4321;

    render(
      <TestProvider>
        <ReconcileMenu
          account={connectedAccount}
          onReconcile={onReconcile}
          onClose={onClose}
        />
      </TestProvider>,
    );

    // Fill from last synced value (43.21)
    await userEvent.click(screen.getByText('Use last synced total'));

    await userEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(onReconcile).toHaveBeenCalledWith(4321);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('submitting with empty input does not reconcile', async () => {
    vi.mocked(useSheetValue).mockReturnValue(2222);

    const onReconcile = vi.fn();
    const onClose = vi.fn();
    render(
      <TestProvider>
        <ReconcileMenu
          account={baseAccount as AccountEntity}
          onReconcile={onReconcile}
          onClose={onClose}
        />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    await userEvent.clear(input);

    await userEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(onReconcile).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('when cleared balance is not available, submits null', async () => {
    // No cleared balance -> input is not rendered
    vi.mocked(useSheetValue).mockReturnValue(null);

    const onReconcile = vi.fn();
    const onClose = vi.fn();
    render(
      <TestProvider>
        <ReconcileMenu
          account={baseAccount as AccountEntity}
          onReconcile={onReconcile}
          onClose={onClose}
        />
      </TestProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Reconcile' }));
    expect(onReconcile).toHaveBeenCalledWith(null);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
