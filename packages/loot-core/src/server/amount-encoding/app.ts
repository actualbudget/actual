import { v4 as uuidv4 } from 'uuid';

import * as connection from '#platform/server/connection';
import { logger } from '#platform/server/log';
import * as sqlite from '#platform/server/sqlite';
import { rescaleBudget } from '#server/amount-encoding/rescale';
import { createApp } from '#server/app';
import { createAllBudgets } from '#server/budget/base';
import * as cloudStorage from '#server/cloud-storage';
import * as db from '#server/db';
import { notifyFxContextChanged } from '#server/exchange-rates/context';
import { resetFormulaPreferencesCache } from '#server/formulas/bootstrap';
import { mutator } from '#server/mutators';
import * as prefs from '#server/prefs';
import * as sheet from '#server/sheet';
import { assertBaseCurrencyChangeAllowed } from '#server/util/currency';
import {
  parseAmountEncoding,
  reviewedAmountEncoding,
} from '#shared/amount-encoding';
import { getCurrency } from '#shared/currencies';

type Preflight = {
  sourceToken: string;
  source: { version: 0 | 1; currencyCode: string; precision: number };
  target: { version: 0 | 1; currencyCode: string; precision: number };
  pending: boolean;
};

export type AmountEncodingHandlers = {
  'amount-encoding/preflight': typeof preflight;
  'amount-encoding/transition': typeof transition;
  'amount-encoding/retry': typeof retry;
};

export const app = createApp<AmountEncodingHandlers>();
app.method('amount-encoding/preflight', preflight);
app.method('amount-encoding/transition', mutator(transition));
app.method('amount-encoding/retry', mutator(retry));

function syncedPreference(id: string): string | undefined {
  return db.firstSync<{ value: string }>(
    'SELECT value FROM preferences WHERE id = ?',
    [id],
  )?.value;
}

function sourceToken() {
  const metadata = prefs.getPrefs();
  if (!metadata?.id) throw new Error('amount-encoding-budget-not-open');
  return JSON.stringify({
    amountEncoding: metadata.amountEncoding ?? null,
    currencyCode: syncedPreference('defaultCurrencyCode') ?? '',
    groupId: metadata.groupId ?? null,
    pending: metadata.amountEncodingTransition?.id ?? null,
  });
}

async function preflight({
  currencyCode,
}: {
  currencyCode: string;
}): Promise<Preflight> {
  await assertBaseCurrencyChangeAllowed(currencyCode);
  const metadata = prefs.getPrefs();
  if (!metadata?.id) throw new Error('amount-encoding-budget-not-open');
  const source = parseAmountEncoding(metadata.amountEncoding);
  const target = reviewedAmountEncoding(currencyCode);
  if (metadata.cloudFileId) {
    if (!metadata.groupId) {
      throw new Error('amount-encoding-sync-reset-required');
    }
    if (!(await cloudStorage.supportsAmountEncoding())) {
      throw new Error('amount-encoding-server-unsupported');
    }
  }
  return {
    sourceToken: sourceToken(),
    source: source ?? {
      version: 0,
      currencyCode: syncedPreference('defaultCurrencyCode') ?? '',
      precision: 2,
    },
    target,
    pending: Boolean(metadata.amountEncodingTransition),
  };
}

async function transition({
  currencyCode,
  sourceToken: expectedSourceToken,
}: {
  currencyCode: string;
  sourceToken: string;
}) {
  await assertBaseCurrencyChangeAllowed(currencyCode);
  if (sourceToken() !== expectedSourceToken) {
    return { error: 'amount-encoding-stale', retryable: false };
  }
  const checked = await preflight({ currencyCode });
  if (checked.pending) {
    const pending = prefs.getPrefs()?.amountEncodingTransition;
    if (pending && pending.targetCurrencyCode !== currencyCode) {
      return {
        error: 'amount-encoding-pending-currency',
        pendingCurrency: pending.targetCurrencyCode,
        retryable: false,
      };
    }
    return retry();
  }
  // Sync can change the source while preflight awaits the server.
  if (checked.sourceToken !== expectedSourceToken) {
    return { error: 'amount-encoding-stale', retryable: false };
  }
  const metadata = prefs.getPrefs();
  if (!metadata?.id) throw new Error('amount-encoding-budget-not-open');
  const targetEncoding = JSON.stringify(checked.target);
  if (
    metadata.amountEncoding === targetEncoding &&
    checked.source.currencyCode === checked.target.currencyCode
  ) {
    return {};
  }

  const database = db.getDatabase();
  if (!database) throw new Error('amount-encoding-budget-not-open');
  const originalEncoding = metadata.amountEncoding ?? null;
  let committed = false;
  try {
    const pending = metadata.cloudFileId
      ? {
          id: uuidv4(),
          sourceGroupId: metadata.groupId!,
          sourceEncoding: originalEncoding,
          targetEncoding,
          targetCurrencyCode: checked.target.currencyCode,
        }
      : undefined;
    sqlite.transaction(database, () => {
      if (checked.source.precision !== checked.target.precision) {
        rescaleBudget(
          database,
          checked.source.precision,
          checked.target.precision,
        );
        // Cached spreadsheet cells hold source-unit values; a missing key
        // makes the next load recompute them.
        db.runQuery('DELETE FROM kvcache_key');
      }
      db.runQuery(
        'INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?)',
        ['defaultCurrencyCode', checked.target.currencyCode],
      );
      // Display preferences follow a new currency; otherwise they stay the user's.
      if (
        checked.target.currencyCode &&
        checked.target.currencyCode !== checked.source.currencyCode
      ) {
        const currency = getCurrency(checked.target.currencyCode);
        for (const [id, value] of [
          ['numberFormat', currency.numberFormat],
          ['hideFraction', 'false'],
          [
            'currencySpaceBetweenAmountAndSymbol',
            // A currency code used as the symbol (e.g. "CHF 100") needs a space
            !currency.symbolFirst || currency.symbol === currency.code
              ? 'true'
              : 'false',
          ],
          ['currencySymbolPosition', currency.symbolFirst ? 'before' : 'after'],
        ]) {
          db.runQuery(
            'INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?)',
            [id, value],
          );
        }
      }
      db.runQuery(
        'INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?)',
        ['amountEncoding', targetEncoding],
      );
      if (pending) {
        db.runQuery(
          'INSERT OR REPLACE INTO preferences (id, value) VALUES (?, ?)',
          ['amountEncodingTransition', JSON.stringify(pending)],
        );
      }
      db.execQuery('DELETE FROM messages_crdt; DELETE FROM messages_clock;');
    });
    committed = true;

    await prefs.savePrefs({
      amountEncoding: targetEncoding,
      amountEncodingTransition: pending,
    });
    await notifyFxContextChanged('budget');
    resetFormulaPreferencesCache();
    await db.loadClock();
    if (checked.source.precision !== checked.target.precision) {
      await rebuildSpreadsheet();
    }
    if (!pending) {
      connection.send('prefs-updated');
      return {};
    }
    return await retry();
  } catch (error) {
    logger.error('Amount encoding transition failed', error);
    // SQLite rolls back failed conversions. After commit, its encoding and
    // pending publication record remain authoritative across reopen and retry.
    return {
      error: error instanceof Error ? error.message : 'amount-encoding-failed',
      retryable:
        committed && Boolean(prefs.getPrefs()?.amountEncodingTransition),
    };
  }
}

/** Recomputes every cell from the rescaled amounts, as opening the budget does. */
async function rebuildSpreadsheet() {
  const current = sheet.get();
  if (!current) return;
  const { budgetType } = current.meta();
  const reloaded = await sheet.reloadSpreadsheet(db);
  reloaded.meta().budgetType = budgetType;
  await createAllBudgets();
}

async function retry() {
  const metadata = prefs.getPrefs();
  const pending = metadata?.amountEncodingTransition;
  if (!pending) return {};
  try {
    const groupId = await cloudStorage.publishAmountEncodingTransition();
    await prefs.savePrefs({
      groupId,
      lastSyncedTimestamp: undefined,
      lastUploaded: undefined,
      amountEncodingTransition: undefined,
    });
    db.runQuery(
      "DELETE FROM preferences WHERE id = 'amountEncodingTransition'",
    );
    await notifyFxContextChanged('budget');
    connection.send('prefs-updated');
    return {};
  } catch (error) {
    logger.error('Amount encoding transition retry failed', error);
    return {
      error: error instanceof Error ? error.message : 'amount-encoding-failed',
      retryable: true,
    };
  }
}
