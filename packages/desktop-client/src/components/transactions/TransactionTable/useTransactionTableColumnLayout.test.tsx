import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTransactionTableColumnLayout } from './useTransactionTableColumnLayout';
import {
  parseTransactionColumnWidthsPref,
  serializeTransactionColumnWidthsPref,
} from './transactionTableColumnLayout';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

vi.mock('@desktop-client/hooks/useSyncedPref', () => ({
  useSyncedPref: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function TestComponent() {
  const { columnWidths, getResizeHandleProps } = useTransactionTableColumnLayout({
    containerWidth: 0,
    showAccount: true,
    showBalances: false,
    showCategory: true,
    showCleared: true,
    showSelection: true,
  });
  const payeeResizeHandle = getResizeHandleProps('payee');

  return (
    <div>
      <div data-testid="width-account">{columnWidths.account}</div>
      <div data-testid="width-payee">{columnWidths.payee}</div>
      <div data-testid="width-notes">{columnWidths.notes}</div>
      {payeeResizeHandle.isResizable && (
        <div
          data-testid="resize-payee"
          onPointerDown={payeeResizeHandle.onPointerDown}
        />
      )}
    </div>
  );
}

describe('useTransactionTableColumnLayout', () => {
  it('persists materialized widths after neighbor resize', () => {
    const setPref = vi.fn();

    vi.mocked(useSyncedPref).mockReturnValue([undefined, setPref]);

    render(<TestComponent />);

    const accountWidthBefore = Number(screen.getByTestId('width-account').textContent);
    const payeeWidthBefore = Number(screen.getByTestId('width-payee').textContent);
    const notesWidthBefore = Number(screen.getByTestId('width-notes').textContent);

    fireEvent.pointerDown(screen.getByTestId('resize-payee'), {
      clientX: 100,
    });
    fireEvent.pointerMove(window, { clientX: 135 });

    expect(Number(screen.getByTestId('width-payee').textContent)).toBe(
      payeeWidthBefore + 35,
    );
    expect(Number(screen.getByTestId('width-notes').textContent)).toBe(
      notesWidthBefore - 35,
    );
    expect(Number(screen.getByTestId('width-account').textContent)).toBe(
      accountWidthBefore,
    );

    fireEvent.pointerUp(window, { clientX: 135 });

    expect(setPref).toHaveBeenCalledTimes(1);
    expect(
      parseTransactionColumnWidthsPref(setPref.mock.calls[0][0] as string),
    ).toMatchObject({
      widths: {
        payee: payeeWidthBefore + 35,
        notes: notesWidthBefore - 35,
        account: accountWidthBefore,
      },
      originalWidths: {
        payee: payeeWidthBefore,
        notes: notesWidthBefore,
        account: accountWidthBefore,
      },
    });
  });

  it('uses persisted widths on mount', () => {
    vi.mocked(useSyncedPref).mockReturnValue([
      serializeTransactionColumnWidthsPref({
        payee: 280,
        notes: 160,
      }),
      vi.fn(),
    ]);

    render(<TestComponent />);

    expect(screen.getByTestId('width-payee').textContent).toBe('280');
    expect(screen.getByTestId('width-notes').textContent).toBe('160');
  });
});
