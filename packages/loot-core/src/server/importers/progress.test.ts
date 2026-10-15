import * as connection from '#platform/server/connection';
import type { ServerEvents } from '#types/server-events';

import { runImportSteps } from './progress';

vi.mock('#platform/server/connection', () => ({ send: vi.fn() }));

function sentProgress() {
  return vi
    .mocked(connection.send)
    .mock.calls.map(
      ([, payload]) => payload as ServerEvents['import-progress'],
    );
}

describe('runImportSteps', () => {
  beforeEach(() => {
    vi.mocked(connection.send).mockClear();
    // Pin the clock so the throttle can't emit an extra event under a slow run.
    vi.spyOn(Date, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports per-step and overall counts as items are imported', async () => {
    const ran: string[] = [];

    await runImportSteps([
      {
        step: 'accounts',
        total: 2,
        run: async tick => {
          ran.push('accounts');
          tick();
          tick();
        },
      },
      {
        step: 'transactions',
        total: 10,
        run: async tick => {
          ran.push('transactions');
          tick(10);
        },
      },
    ]);

    expect(ran).toEqual(['accounts', 'transactions']);
    expect(sentProgress()).toEqual([
      {
        step: 'accounts',
        current: 0,
        total: 2,
        overallCurrent: 0,
        overallTotal: 12,
      },
      {
        step: 'accounts',
        current: 2,
        total: 2,
        overallCurrent: 2,
        overallTotal: 12,
      },
      {
        step: 'transactions',
        current: 0,
        total: 10,
        overallCurrent: 2,
        overallTotal: 12,
      },
      {
        step: 'transactions',
        current: 10,
        total: 10,
        overallCurrent: 12,
        overallTotal: 12,
      },
      {
        step: 'finishing',
        current: 0,
        total: 0,
        overallCurrent: 12,
        overallTotal: 12,
      },
    ]);
  });

  it('reports a named batch immediately, without waiting out the throttle', async () => {
    await runImportSteps([
      {
        step: 'transactions',
        total: 30,
        run: async tick => {
          tick(10, 'Checking');
          tick(20, 'Savings');
        },
      },
    ]);

    expect(sentProgress().map(payload => payload.batch)).toEqual([
      undefined,
      { amount: 10, account: 'Checking' },
      { amount: 20, account: 'Savings' },
      undefined,
      undefined,
    ]);
  });

  it('snaps a step to its total when the estimate was off', async () => {
    // The step only imports 1 of the 5 items it estimated, but progress still
    // has to end up complete.
    await runImportSteps([
      { step: 'payees', total: 5, run: async tick => tick() },
    ]);

    expect(sentProgress().at(-2)).toEqual({
      step: 'payees',
      current: 5,
      total: 5,
      overallCurrent: 5,
      overallTotal: 5,
    });
  });
});
