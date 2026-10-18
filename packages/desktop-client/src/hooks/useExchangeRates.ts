import { useSyncExternalStore } from 'react';

import { buildRateIndex } from '@actual-app/core/shared/fx/rates';
import type { RateIndex } from '@actual-app/core/shared/fx/rates';
import { q } from '@actual-app/core/shared/query';
import type { ExchangeRateEntity } from '@actual-app/core/types/models';

import { liveQuery } from '#queries/liveQuery';
import type { LiveQuery } from '#queries/liveQuery';

import { useMetadataPref } from './useMetadataPref';

type ExchangeRatesSnapshot = {
  exchangeRates: readonly ExchangeRateEntity[];
  rateIndex: RateIndex;
  isLoading: boolean;
};

const EMPTY_SNAPSHOT: ExchangeRatesSnapshot = {
  exchangeRates: [],
  rateIndex: buildRateIndex([]),
  isLoading: true,
};

// Every amount in another currency needs the rates, so a single live query
// is shared by all components instead of one per table row.
//
// The last rates are kept when no component needs them for a moment, e.g.
// while switching pages, so amounts don't briefly count 1:1. They are tagged
// with their budget so another budget never sees them.
let snapshot = EMPTY_SNAPSHOT;
let snapshotBudgetId: string | null = null;
let live: LiveQuery<ExchangeRateEntity> | null = null;
let liveBudgetId: string | null = null;
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach(notify => notify());
}

function startLiveQuery(budgetId: string) {
  live?.unsubscribe();
  liveBudgetId = budgetId;
  live = liveQuery<ExchangeRateEntity>(q('exchange_rates').select('*'), {
    onData: data => {
      snapshot = {
        exchangeRates: data,
        rateIndex: buildRateIndex(data),
        isLoading: false,
      };
      snapshotBudgetId = budgetId;
      notifyAll();
    },
  });
}

function subscribeTo(budgetId: string) {
  return (listener: () => void) => {
    listeners.add(listener);
    if (live === null || liveBudgetId !== budgetId) {
      startLiveQuery(budgetId);
    }

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && live !== null) {
        live.unsubscribe();
        live = null;
        liveBudgetId = null;
      }
    };
  };
}

// One subscribe function per budget, so React only resubscribes when the
// budget changes
const subscribers = new Map<string, ReturnType<typeof subscribeTo>>();

function getSubscriber(budgetId: string) {
  let subscribe = subscribers.get(budgetId);
  if (!subscribe) {
    subscribe = subscribeTo(budgetId);
    subscribers.set(budgetId, subscribe);
  }
  return subscribe;
}

function unsubscribeNothing() {
  return undefined;
}

function subscribeNothing() {
  return unsubscribeNothing;
}

function getEmptySnapshot() {
  return EMPTY_SNAPSHOT;
}

// Rates are only loaded while `enabled`, so budgets that don't use
// multiple currencies never query them
export function useExchangeRates({
  enabled = true,
}: { enabled?: boolean } = {}): ExchangeRatesSnapshot {
  const [budgetId = ''] = useMetadataPref('id');
  const isActive = enabled && budgetId !== '';

  return useSyncExternalStore(
    isActive ? getSubscriber(budgetId) : subscribeNothing,
    isActive
      ? () => (snapshotBudgetId === budgetId ? snapshot : EMPTY_SNAPSHOT)
      : getEmptySnapshot,
  );
}
