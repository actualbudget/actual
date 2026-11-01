import { initServer } from '@actual-app/core/platform/client/connection';
import { renderHook, waitFor } from '@testing-library/react';

import { useEditEffects } from './useEditEffects';
import type { EditEffectRow } from './useEditEffects';

vi.mock(
  '@actual-app/core/platform/client/connection',
  () => import('#mocks/connection'),
);

const row = (amount: number): EditEffectRow[] => [
  {
    before: { account: 'a', category: 'food', date: '2026-03-10', amount: -1 },
    after: { account: 'a', category: 'food', date: '2026-03-10', amount },
  },
];

describe('useEditEffects', () => {
  it('discards a response for an older draft', async () => {
    const pending: Array<(value: unknown) => void> = [];
    initServer({
      'budget/edit-effects': (() =>
        new Promise(resolve => pending.push(resolve))) as never,
    });
    const { result, rerender } = renderHook(
      ({ rows }) => useEditEffects(rows),
      { initialProps: { rows: row(-2) } },
    );
    expect(result.current).toEqual({ status: 'loading' });
    rerender({ rows: row(-3) });
    await waitFor(() => expect(pending).toHaveLength(2));
    // The first draft's answer arrives last and is ignored.
    pending[1]([{ month: '2026-03', effects: [] }]);
    pending[0]([{ month: 'old', effects: [] }]);
    await waitFor(() =>
      expect(result.current).toEqual({
        status: 'ready',
        months: [{ month: '2026-03', effects: [] }],
      }),
    );
  });

  it('reports a failed read and has no state without a draft', async () => {
    initServer({
      'budget/edit-effects': (async () => {
        throw new Error('offline');
      }) as never,
    });
    const { result, rerender } = renderHook(
      ({ rows }) => useEditEffects(rows),
      { initialProps: { rows: row(-2) as EditEffectRow[] | null } },
    );
    await waitFor(() => expect(result.current).toEqual({ status: 'error' }));
    rerender({ rows: null });
    expect(result.current).toEqual({ status: 'none' });
  });
});
