import { setNumberFormat } from '@actual-app/core/shared/util';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AmountInput } from './AmountInput';
import { primeIOSKeyboard, takePrimedIOSKeyboard } from './iosKeyboard';

const platform = vi.hoisted(() => ({ isIOS: true, isIOSAgent: true }));
vi.mock('@actual-app/core/shared/platform', () => platform);

vi.mock('#hooks/useFeatureFlag', () => ({ useFeatureFlag: () => false }));
vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: () => [undefined, vi.fn()],
}));

describe('AmountInput on iOS Safari', () => {
  afterEach(() => {
    takePrimedIOSKeyboard();
    document.body.innerHTML = '';
  });

  function renderNewTransactionAmount() {
    setNumberFormat({ format: 'comma-dot', hideFraction: false });
    render(<AmountInput value={0} autoFocus disableNativeAutoFocusOnIOS />);
    return screen.getByTestId('amount-input');
  }

  it('takes focus when the tap primed the keyboard', () => {
    primeIOSKeyboard();
    const input = renderNewTransactionAmount();

    expect(document.activeElement).toBe(input);
  });

  it('keeps the old no-autofocus behaviour without a priming tap', () => {
    const input = renderNewTransactionAmount();

    expect(document.activeElement).not.toBe(input);
  });
});
