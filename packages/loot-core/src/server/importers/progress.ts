import * as connection from '#platform/server/connection';
import { logger } from '#platform/server/log';
import type { ImportStep } from '#types/server-events';

/**
 * Reports that `count` more items of the current step have been imported.
 * Steps that import a batch at a time can name the account it belonged to, so
 * the client can say which one it just finished.
 */
export type ImportTick = (count?: number, account?: string) => void;

type ImportStepDefinition = {
  step: ImportStep;
  /**
   * How many items this step expects to import. Only used to show progress, so
   * an estimate is fine — the step is snapped to its total once it finishes.
   */
  total: number;
  run: (tick: ImportTick) => Promise<unknown>;
};

// Importing tens of thousands of items would otherwise flood the client with
// an event per item.
const MIN_EVENT_INTERVAL_MS = 100;

/**
 * Runs each import step in order, reporting progress to the client so it can
 * show which stage the import is on and how far along it is.
 */
export async function runImportSteps(steps: ImportStepDefinition[]) {
  const overallTotal = steps.reduce((sum, { total }) => sum + total, 0);
  let overallCurrent = 0;
  let lastSentAt = 0;

  for (const { step, total, run } of steps) {
    logger.log(`Importing ${step}...`);
    let current = 0;

    const emit = (batch?: { amount: number; account: string }) => {
      lastSentAt = Date.now();
      connection.send('import-progress', {
        step,
        current,
        total,
        overallCurrent,
        overallTotal,
        batch,
      });
    };

    emit();

    await run((count = 1, account) => {
      current += count;
      overallCurrent += count;
      // Always report a named batch: they are rare, and the account name is
      // the whole point of the message.
      if (account !== undefined) {
        emit({ amount: count, account });
      } else if (Date.now() - lastSentAt >= MIN_EVENT_INTERVAL_MS) {
        emit();
      }
    });

    // Totals are estimated up front, so snap the step up to its total instead
    // of leaving the bar short. Never snap back: an overshooting estimate must
    // not make the overall bar run backwards.
    overallCurrent += Math.max(0, total - current);
    current = total;
    emit();
  }

  logger.log('Setting up...');
  connection.send('import-progress', {
    step: 'finishing',
    current: 0,
    total: 0,
    overallCurrent: overallTotal,
    overallTotal,
  });
}
