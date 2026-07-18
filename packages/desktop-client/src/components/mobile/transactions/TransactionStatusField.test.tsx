import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TransactionStatusField } from './TransactionStatusField';

describe('TransactionStatusField', () => {
  it('allows a reconciled transaction to be toggled off', async () => {
    const user = userEvent.setup();
    const onToggleReconciled = vi.fn();

    const { rerender } = render(
      <TransactionStatusField
        isCleared
        isReconciled
        onToggleCleared={vi.fn()}
        onToggleReconciled={onToggleReconciled}
      />,
    );

    const reconciledToggle = screen.getByRole('checkbox', {
      name: 'Reconciled',
    });
    expect(reconciledToggle).toBeChecked();
    expect(reconciledToggle).toBeEnabled();

    await user.click(reconciledToggle);

    expect(onToggleReconciled).toHaveBeenCalledWith(false);

    const toggleId = reconciledToggle.id;
    rerender(
      <TransactionStatusField
        isCleared
        isReconciled={false}
        onToggleCleared={vi.fn()}
        onToggleReconciled={onToggleReconciled}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Cleared' })).toHaveAttribute(
      'id',
      toggleId,
    );
  });
});
