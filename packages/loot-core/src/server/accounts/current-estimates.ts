import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { resolveRate } from '#server/exchange-rates/app';
import {
  getDefaultCurrencyCode,
  getRecordedAmountPrecision,
  isMulticurrencyAvailable,
} from '#server/util/currency';
import { nativeToBase } from '#shared/exchange-rate';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { Query } from '#shared/query';
import type { ExchangeRateKind } from '#types/models';

export type CurrentEstimate =
  | { status: 'zero'; baseAmount: 0 }
  | {
      status: 'resolved';
      baseAmount: number;
      rate: string;
      kind: ExchangeRateKind | 'explicit';
      source: string;
      timestamp: string | null;
      fallback: boolean;
    }
  | { status: 'unavailable' };

export type AccountEstimate = {
  id: string;
  nativeBalance: number;
  storedBaseAmount: number;
  estimate: CurrentEstimate;
};

export type GroupEstimate = {
  storedBaseAmount: number;
  convertedAmount: number;
  missing: string[];
};

async function sum(query: Query): Promise<number> {
  const { data } = await aqlQuery(query);
  return typeof data === 'number' ? data : 0;
}

// The sidebar's binding queries, so stored values and native balances follow
// AQL's split and live-parent rules exactly as the displays do: group totals
// use the default (inline) splits, an account's balance counts parents.
const storedBase = (filter: Record<string, unknown>) =>
  sum(q('transactions').filter(filter).calculate({ $sum: '$amount' }));
const accountStoredBase = (account: string) =>
  sum(
    q('transactions')
      .filter({ account })
      .options({ splits: 'none' })
      .calculate({ $sum: '$amount' }),
  );
const nativeBalanceOf = (account: string) =>
  sum(
    q('transactions')
      .filter({ account })
      .options({ splits: 'none' })
      .calculate({ $sum: '$transaction_amount' }),
  );

/**
 * What each open foreign account's native balance is worth at today's rate,
 * and the converted totals of the sidebar groups. Stored totals are
 * returned alongside, unchanged.
 */
export async function getCurrentEstimates(): Promise<{
  date: string;
  accounts: AccountEstimate[];
  groups: Record<'all' | 'onBudget' | 'offBudget', GroupEstimate>;
}> {
  if (!(await isMulticurrencyAvailable())) {
    throw new Error('multicurrency-unavailable');
  }
  const baseCurrency = await getDefaultCurrencyCode();
  const basePrecision = getRecordedAmountPrecision();
  const date = monthUtils.currentDay();
  const foreign = await db.all<{
    id: string;
    offbudget: number;
    currency: string;
    currency_precision: number;
  }>(
    `SELECT id, offbudget, currency, currency_precision FROM accounts
       WHERE tombstone = 0 AND closed = 0 AND currency IS NOT NULL
         AND currency_precision IS NOT NULL`,
  );

  const accounts: AccountEstimate[] = [];
  // Each account's share of the inline group totals, replaced by its
  // estimate in converted totals.
  const groupShare = new Map<string, number>();
  for (const account of foreign) {
    const nativeBalance = await nativeBalanceOf(account.id);
    const storedBaseAmount = await accountStoredBase(account.id);
    groupShare.set(account.id, await storedBase({ account: account.id }));
    let estimate: CurrentEstimate;
    if (nativeBalance === 0) {
      estimate = { status: 'zero', baseAmount: 0 };
    } else {
      const resolution = await resolveRate({
        baseCurrency,
        quoteCurrency: account.currency,
        date,
      });
      estimate =
        resolution.status === 'resolved'
          ? {
              ...resolution,
              baseAmount: nativeToBase(
                nativeBalance,
                account.currency_precision,
                basePrecision,
                resolution.rate,
              ),
            }
          : { status: 'unavailable' };
    }
    accounts.push({
      id: account.id,
      nativeBalance,
      storedBaseAmount,
      estimate,
    });
  }

  const group = async (
    filter: Record<string, unknown>,
    inGroup: (offbudget: number) => boolean,
  ): Promise<GroupEstimate> => {
    const storedBaseAmount = await storedBase({
      ...filter,
      'account.closed': false,
    });
    let convertedAmount = storedBaseAmount;
    const missing: string[] = [];
    for (const account of accounts) {
      const { offbudget } = foreign.find(f => f.id === account.id)!;
      if (!inGroup(offbudget)) continue;
      // Replace the account's stored base with its estimate, or leave it
      // out (and say so) when no rate resolves.
      convertedAmount -= groupShare.get(account.id) ?? 0;
      if (account.estimate.status === 'unavailable') {
        missing.push(account.id);
      } else {
        convertedAmount += account.estimate.baseAmount;
      }
    }
    return { storedBaseAmount, convertedAmount, missing };
  };

  return {
    date,
    accounts,
    groups: {
      all: await group({}, () => true),
      onBudget: await group({ 'account.offbudget': false }, o => o === 0),
      offBudget: await group({ 'account.offbudget': true }, o => o === 1),
    },
  };
}
