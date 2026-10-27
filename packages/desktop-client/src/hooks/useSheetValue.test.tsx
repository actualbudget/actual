import type { ReactNode } from 'react';

import {
  initServer,
  serverPush,
} from '@actual-app/core/platform/client/connection';
import { act, renderHook, waitFor } from '@testing-library/react';

import { SheetNameProvider } from './useSheetName';
import { useSheetValue } from './useSheetValue';
import { SpreadsheetProvider } from './useSpreadsheet';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SpreadsheetProvider>
      <SheetNameProvider name="budget202610">{children}</SheetNameProvider>
    </SpreadsheetProvider>
  );
}

describe('useSheetValue', () => {
  it('follows a cell on another sheet when the binding names it', async () => {
    const getCell = vi.fn(
      async ({ sheetName, name }: { sheetName: string; name: string }) => ({
        name: `${sheetName}!${name}`,
        value: 'first',
      }),
    );
    initServer({ 'get-cell': getCell });

    const { result } = renderHook(
      () =>
        useSheetValue<'envelope-budget', '__global!future-buffer-start'>(
          '__global!future-buffer-start',
        ),
      { wrapper },
    );

    await waitFor(() => expect(result.current).toBe('first'));
    expect(getCell).toHaveBeenCalledWith({
      sheetName: '__global',
      name: 'future-buffer-start',
    });

    await act(async () => {
      serverPush('cells-changed', [
        { name: '__global!future-buffer-start', value: 'second' },
      ]);
    });
    await waitFor(() => expect(result.current).toBe('second'));
  });
});
