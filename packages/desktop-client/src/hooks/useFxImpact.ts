import { useEffect, useRef, useState } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import {
  currentDay,
  getMonth,
  rangeInclusive,
} from '@actual-app/core/shared/months';
import type {
  FxImpactRequest,
  FxImpactResult,
} from '@actual-app/core/types/models';

import { useMetadataPref } from './useMetadataPref';
import { useSyncedPref } from './useSyncedPref';

export type FxImpactSelection = Pick<
  FxImpactRequest,
  'startMonth' | 'endMonth'
> &
  Partial<Pick<FxImpactRequest, 'accountIds' | 'currencies'>>;

/**
 * The worker selection for a report range and saved selections, or null
 * when the range exceeds the 120 months one request may cover.
 */
export function fxImpactSelection(
  start: string,
  end: string,
  accountIds: string[] | undefined | null,
  currencies: string[] | undefined | null,
): FxImpactSelection | null {
  const [startMonth, endMonth] = [getMonth(start), getMonth(end)];
  if (rangeInclusive(startMonth, endMonth).length > 120) return null;
  return { startMonth, endMonth, accountIds, currencies };
}

type Snapshot = {
  context: string;
  data: FxImpactResult | undefined;
  isError: boolean;
  isFetching: boolean;
};

const fxTables = [
  'transactions',
  'accounts',
  'exchange_rates',
  'preferences',
  'category_pockets',
  'pocket_budgets',
  'slot_retirements',
  'category_slot_meta',
  // Reservations count under the categories these decide.
  'categories',
  'category_mapping',
];
const budgetCell = /^budget(\d{4})(\d{2})!(.+)$/;

/**
 * The walk couples months, so any month's FX cells count; any other cell of
 * a month sheet outside the result's created months means a month was created.
 */
function isRelevantCell(
  name: string,
  createdMonths: FxImpactResult['createdMonths'] | undefined,
) {
  const match = budgetCell.exec(name);
  if (!match) return false;
  const [, year, monthOfYear, cell] = match;
  if (
    cell === 'fx-changes' ||
    cell === 'fx-incomplete' ||
    cell.startsWith('reservation-') ||
    cell.startsWith('pocket-value-')
  ) {
    return true;
  }
  const month = `${year}-${monthOfYear}`;
  return (
    !createdMonths || month < createdMonths.first || month > createdMonths.last
  );
}

/**
 * Reads `report/fx-impact` for one context (budget, recorded encoding,
 * normalized request and day). Each relevant notification advances a
 * generation; a read that settles behind the generation starts exactly one
 * follow-up. A failed read is not retried until the next notification or
 * `retry`. The worker read also works offline.
 */
export function useFxImpact(selection: FxImpactSelection | null) {
  const [budgetId] = useMetadataPref('id');
  const [encoding] = useSyncedPref('amountEncoding');
  const [day, setDay] = useState(currentDay);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const retryRef = useRef<() => void>(null);

  const requestKey = selection
    ? JSON.stringify({
        startMonth: selection.startMonth,
        endMonth: selection.endMonth,
        accountIds: selection.accountIds
          ? [...selection.accountIds].sort()
          : null,
        currencies: selection.currencies
          ? [...selection.currencies].sort()
          : null,
      } satisfies FxImpactRequest)
    : null;
  const context =
    budgetId && requestKey
      ? JSON.stringify([budgetId, encoding ?? null, requestKey, day])
      : null;

  useEffect(() => {
    const timer = setInterval(() => setDay(currentDay()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!context || !requestKey) return;
    // This closure is the context's epoch: after any change, even back to an
    // earlier context, its reads can no longer commit or follow up.
    const request: FxImpactRequest = JSON.parse(requestKey);
    let active = true;
    let generation = 0;
    let inFlight = false;
    let isError = false;
    let committed: FxImpactResult | undefined;
    const publish = () =>
      setSnapshot({ context, data: committed, isError, isFetching: inFlight });

    function start() {
      const started = generation;
      inFlight = true;
      publish();
      send('report/fx-impact', request).then(
        result => {
          if (!active) return;
          inFlight = false;
          // A midnight crossing during the read must get a new context now.
          if (currentDay() !== day) {
            setDay(currentDay());
            return;
          }
          committed = result;
          isError = false;
          publish();
          if (generation !== started) start();
        },
        () => {
          if (!active) return;
          inFlight = false;
          isError = true;
          publish();
        },
      );
    }
    function notify() {
      generation++;
      if (!inFlight) start();
    }

    const stopSync = listen('sync-event', event => {
      if (
        event.type === 'applied' &&
        event.tables.some(table => fxTables.includes(table))
      ) {
        notify();
      }
    });
    const stopCells = listen('cells-changed', nodes => {
      if (
        nodes.some(node => isRelevantCell(node.name, committed?.createdMonths))
      ) {
        notify();
      }
    });
    retryRef.current = () => {
      if (active && !inFlight) start();
    };
    start();
    return () => {
      active = false;
      stopSync();
      stopCells();
    };
  }, [context, requestKey, day]);

  // Another context's result, or the old day's between midnight and the
  // watcher's tick, is never shown.
  const current =
    snapshot && snapshot.context === context && day === currentDay()
      ? snapshot
      : null;
  return {
    data: current?.data,
    isError: current?.isError ?? false,
    isFetching: current ? current.isFetching : !!context,
    isLoading: !!context && !current?.data && !current?.isError,
    retry: () => retryRef.current?.(),
  };
}
