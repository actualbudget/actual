import { useEffect } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';
import type {
  CategoryPocketsMonth,
  ReservationExplanation,
} from '@actual-app/core/server/budget/pocket-readers';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMetadataPref } from './useMetadataPref';
import { useMulticurrencyAvailable } from './useMulticurrencyAvailable';
import { useSyncedPref } from './useSyncedPref';

export type PocketSlot = { id: string; currency: string; hidden: boolean };
/** Natives at the currency explanation's precision, not a slot's. */
export type PocketBacking = ReservationExplanation['backing'] & {
  precision: number;
};
/** A category's slots over the visible months. */
export type CategorySlots = { baseShown: boolean; slots: PocketSlot[] };

const pocketsKey = ['budget', 'category-pockets'] as const;
const pocketTables = [
  'category_pockets',
  'pocket_budgets',
  'slot_retirements',
  'category_slot_meta',
  'categories',
  'category_mapping',
];
/** Every budget, pocket and reservation cell lives in a month sheet. */
const budgetCell = /^budget\d{6}!/;
const pocketCell = /!category-pockets-(.+)$/;
const empty = new Map<string, CategoryPocketsMonth>();
const noBacking = new Map<string, PocketBacking>();

function useEnabled() {
  const [budgetId] = useMetadataPref('id');
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const available = useMulticurrencyAvailable();
  return {
    budgetId,
    enabled: !!budgetId && available && budgetType === 'envelope',
  };
}

function pocketsQuery(
  budgetId: string | undefined,
  month: string,
  enabled: boolean,
) {
  return {
    queryKey: [...pocketsKey, budgetId, month],
    queryFn: async () => {
      const cells = await send('envelope-budget-month', { month });
      const pockets = new Map<string, CategoryPocketsMonth>();
      for (const cell of cells) {
        const id = pocketCell.exec(cell.name)?.[1];
        if (id && typeof cell.value === 'object' && cell.value !== null) {
          pockets.set(id, cell.value);
        }
      }
      return pockets;
    },
    enabled,
    retry: false,
    networkMode: 'always' as const,
    staleTime: Infinity,
  };
}

/**
 * Each affected category's month from the MC-10.3 reader (slot totals and
 * currency pockets), keyed by category id. Empty without pockets.
 */
export function useCategoryPockets(month: string) {
  const { budgetId, enabled } = useEnabled();
  const { data } = useQuery(pocketsQuery(budgetId, month, enabled));
  // A closed gate hides data cached while it was open.
  return (enabled && data) || empty;
}

/**
 * Reads pockets again after any change that can move them. Mounted once by
 * each budget page, so a change sends one request per month.
 */
export function usePocketInvalidation() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () =>
      void queryClient.invalidateQueries({ queryKey: pocketsKey });
    const stopSync = listen('sync-event', event => {
      if (
        event.type === 'applied' &&
        event.tables.some(table => pocketTables.includes(table))
      ) {
        invalidate();
      }
    });
    const stopCells = listen('cells-changed', nodes => {
      if (nodes.some(node => budgetCell.test(node.name))) invalidate();
    });
    return () => {
      stopSync();
      stopCells();
    };
  }, [queryClient]);
}

/**
 * Every currency slot of each category shown in any of the months, in
 * first-seen order, and whether any month shows its base slot. Also keeps
 * the pocket reads fresh.
 */
export function usePocketSlots(months: string[]) {
  usePocketInvalidation();
  const { budgetId, enabled } = useEnabled();
  const results = useQueries({
    queries: months.map(month => pocketsQuery(budgetId, month, enabled)),
  });
  const slots = new Map<string, CategorySlots>();
  if (!enabled) return slots;
  for (const { data } of results) {
    for (const [category, entry] of data ?? []) {
      const found = slots.get(category) ?? { baseShown: false, slots: [] };
      // A reader without the field predates base visibility: shown.
      found.baseShown ||= entry.baseSlot?.shown ?? true;
      for (const { id, currency, hidden } of entry.pockets) {
        if (!found.slots.some(slot => slot.id === id)) {
          found.slots.push({ id, currency, hidden });
        }
      }
      slots.set(category, found);
    }
  }
  return slots;
}

/**
 * Each currency's backing (reserved and held natives, and whether the
 * reservation is short) from the MC-8.2 details, for months with pockets.
 */
export function usePocketBacking(month: string) {
  const { budgetId, enabled } = useEnabled();
  const pockets = useCategoryPockets(month);
  const { data } = useQuery({
    queryKey: [...pocketsKey, budgetId, month, 'backing'],
    queryFn: async () => {
      const details = await send('budget/fx-valuation', { month });
      return new Map<string, PocketBacking>(
        (details.reservations?.currencies ?? []).map(currency => [
          currency.currency,
          { ...currency.backing, precision: currency.precision },
        ]),
      );
    },
    enabled: enabled && pockets.size > 0,
    retry: false,
    networkMode: 'always',
    staleTime: Infinity,
  });
  return (enabled && data) || noBacking;
}
