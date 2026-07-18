import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TransactionStatusField } from './TransactionStatusField';

describe('TransactionStatusField', () => {
  it('allows a reconciled transaction to be toggled off', async () => {
    const user = userEvent.setup();
    const onToggleReconciled = vi.fn();

    render(
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
  });
});
