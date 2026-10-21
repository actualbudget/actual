import { useEffect, useState } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import { currentDay } from '@actual-app/core/shared/months';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useMetadataPref } from './useMetadataPref';
import { useSyncedPref } from './useSyncedPref';

export type FxValuation = Awaited<
  ReturnType<typeof send<'budget/fx-valuation'>>
>;

const valuationKey = ['budget', 'fx-valuation'] as const;
const valuationTables = [
  'transactions',
  'accounts',
  'exchange_rates',
  'preferences',
  // Currency pocket reservations and the categories they count under.
  'category_pockets',
  'pocket_budgets',
  'slot_retirements',
  'category_slot_meta',
  'categories',
  'category_mapping',
];
/** Reservation and lane value cells can change while the FX pair holds. */
const reservationCell = /!(reservation-|pocket-value-)/;

/** Mounted only by the open details dialog. The worker read also works offline. */
export function useFxValuation(
  month: string,
  included: number | null,
  incomplete: boolean | null,
) {
  const [budgetId] = useMetadataPref('id');
  const [encoding] = useSyncedPref('amountEncoding');
  const [day, setDay] = useState(currentDay);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setDay(currentDay()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: valuationKey });
    const stopSync = listen('sync-event', event => {
      if (
        event.type === 'applied' &&
        event.tables.some(table => valuationTables.includes(table))
      ) {
        invalidate();
      }
    });
    const stopCells = listen('cells-changed', nodes => {
      if (nodes.some(node => reservationCell.test(node.name))) invalidate();
    });
    return () => {
      stopSync();
      stopCells();
    };
  }, [queryClient]);

  const query = useQuery({
    queryKey: [
      ...valuationKey,
      budgetId,
      encoding,
      month,
      day,
      included,
      incomplete,
    ],
    queryFn: async () => {
      const result = await send('budget/fx-valuation', { month });
      // A midnight crossing during the request must get a new context immediately.
      setDay(currentDay());
      return result;
    },
    enabled: !!budgetId && included !== null && incomplete !== null,
    retry: false,
    networkMode: 'always',
    staleTime: Infinity,
    gcTime: 0,
  });
  // Between midnight and the next tick the old day's result is hidden, so report it as loading.
  if (day !== currentDay() && !query.isError) {
    return {
      ...query,
      data: undefined,
      status: 'pending' as const,
      isPending: true,
      isSuccess: false,
    };
  }
  return { ...query, data: query.isError ? undefined : query.data };
}
