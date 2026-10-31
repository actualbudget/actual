import { useLayoutEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { PocketMonth } from '@actual-app/core/server/budget/pocket-readers';
import type { PocketValuation } from '@actual-app/core/server/budget/reservations';
import * as monthUtils from '@actual-app/core/shared/months';
import { MAX_SAFE_NUMBER } from '@actual-app/core/shared/util';
import type { CategoryGroupEntity } from '@actual-app/core/types/models';

import { makeAmountGrey } from '#components/budget/util';
import { FinancialText } from '#components/FinancialText';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { CurrencyFormatProvider } from '#hooks/currencyFormatContext';
import { useCategoryPockets } from '#hooks/useCategoryPockets';
import type { PocketBacking } from '#hooks/useCategoryPockets';
import { useFormat } from '#hooks/useFormat';
import { useLocale } from '#hooks/useLocale';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

/**
 * An amount in the active currency (the budget currency unless inside a
 * currency format provider). An unknown amount is never shown as zero.
 */
export function Amount({
  value,
  style,
}: {
  value: number | null;
  style?: CSSProperties;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  return (
    <PrivacyFilter>
      <FinancialText style={{ ...makeAmountGrey(value), ...style }}>
        {value === null ? t('Unavailable') : format(value, 'financial')}
      </FinancialText>
    </PrivacyFilter>
  );
}

/** A native amount, an integer at the slot's display precision. */
export function NativeAmount({
  value,
  currency,
  precision,
  style,
}: {
  value: number | null;
  currency: string;
  precision: number;
  style?: CSSProperties;
}) {
  return (
    <CurrencyFormatProvider currencyCode={currency} precision={precision}>
      <Amount value={value} style={style} />
    </CurrencyFormatProvider>
  );
}

const repairStatuses = ['duplicate', 'orphan', 'unresolved'];

/** Short state labels a slot row shows: valuation, shortage, pending, repair. */
export function usePocketLabels(pocket: PocketMonth, backing?: PocketBacking) {
  const { t } = useTranslation();
  const valuations: Partial<Record<PocketValuation, string>> = {
    'included-rate': t('Valued at included rate'),
    'last-unit-value': t('Valued at last unit value'),
    unvalued: t('Unvalued'),
    'unknown-native': t('Unknown amount'),
  };
  return [
    valuations[pocket.valuation],
    backing?.shortage ? t('Reserved, not held') : undefined,
    pocket.incomplete.includes('entry-pending') ? t('Pending') : undefined,
    pocket.lanes.some(lane => repairStatuses.includes(lane.status))
      ? t('Needs repair')
      : undefined,
  ].filter(label => label !== undefined);
}

export function PocketLabels({ labels }: { labels: string[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {labels.map(label => (
        <Text key={label} style={{ fontSize: 11, color: theme.warningText }}>
          {label}
        </Text>
      ))}
    </View>
  );
}

/** "Travel JPY, January 2026": names a slot's month for assistive tech. */
export function useSlotName(
  categoryName: string,
  currency: string,
  month: string,
) {
  const { t } = useTranslation();
  const locale = useLocale();
  return t('{{category}} {{currency}}, {{month}}', {
    category: categoryName,
    currency,
    month: monthUtils.format(month, 'MMMM yyyy', locale),
  });
}

/** Opens a slot's details and actions for a month. */
export function useOpenPocket() {
  const dispatch = useDispatch();
  return (categoryId: string, pocketId: string, month: string) =>
    dispatch(
      pushModal({
        modal: {
          name: 'category-pocket',
          options: { categoryId, pocketId, month },
        },
      }),
    );
}

/** Opens a category's base slot lanes and repairs for a month. */
export function useOpenBaseSlot() {
  const dispatch = useDispatch();
  return (categoryId: string, month: string) =>
    dispatch(
      pushModal({
        modal: { name: 'base-slot', options: { categoryId, month } },
      }),
    );
}

/** A group total; null with a reason when unknown. */
type GroupTotal = { value: number | null; reason: string | null };
export type GroupTotals = Record<'budgeted' | 'spent' | 'balance', GroupTotal>;

/** The ordinary cells a category row displays, by field. */
const cellPrefixes = {
  budgeted: 'budget',
  spent: 'sum-amount',
  balance: 'leftover',
} as const;

/**
 * The ordinary cells of some categories in a month, as their rows show
 * them through useSheetValue: a value not yet received shows as zero, and
 * after a month switch each cell keeps its last value until the new
 * month's arrives. A subscription's callbacks stop at its cleanup, since
 * the client can still deliver a shared pending read afterwards; so an
 * obsolete month's late reply never lands.
 */
function useCategoryCells(month: string, ids: string[]) {
  const spreadsheet = useSpreadsheet();
  const sheet = monthUtils.sheetForMonth(month);
  const key = ids.join(',');
  const [values, setValues] = useState<Record<string, unknown>>({});
  useLayoutEffect(() => {
    let active = true;
    const unbinds = key
      .split(',')
      .filter(id => id !== '')
      .flatMap(id =>
        Object.values(cellPrefixes).map(prefix => {
          const name = `${prefix}-${id}`;
          return spreadsheet.bind(sheet, { name }, node => {
            if (!active) return;
            setValues(prev =>
              prev[name] === node.value
                ? prev
                : { ...prev, [name]: node.value },
            );
          });
        }),
      );
    return () => {
      active = false;
      unbinds.forEach(unbind => unbind());
    };
  }, [spreadsheet, sheet, key]);
  return values;
}

const MAX = BigInt(MAX_SAFE_NUMBER);

/**
 * A group's displayed totals when any of its categories has pockets: the
 * sum of exactly what its category rows display now, the cached reader
 * parent total of each pocket category and the current ordinary cells of
 * every other category (hidden ones included, as the group cells do). The
 * sum is exact; an unknown contribution makes it unknown, and only the final
 * sum is bounded. Undefined when no category of the group has pockets, so
 * the group keeps its existing cells. Display only.
 */
export function usePocketGroupTotals(
  group: CategoryGroupEntity,
  month: string,
): GroupTotals | undefined {
  const { t } = useTranslation();
  const pockets = useCategoryPockets(month);
  const categories = group.categories ?? [];
  const hasPockets = categories.some(category => pockets.has(category.id));
  const cells = useCategoryCells(
    month,
    hasPockets
      ? categories
          .filter(category => !pockets.has(category.id))
          .map(category => category.id)
      : [],
  );
  if (!hasPockets) return undefined;
  const total = (field: keyof GroupTotals): GroupTotal => {
    let sum = 0n;
    let unknown: string | null = null;
    for (const category of categories) {
      const entry = pockets.get(category.id);
      if (entry) {
        const shown = entry[field];
        if (shown === null) unknown ??= category.name;
        else sum += BigInt(shown);
      } else {
        // Exactly what the ordinary row shows; it shows a missing value
        // as zero.
        const cell = cells[`${cellPrefixes[field]}-${category.id}`];
        if (typeof cell === 'number') sum += BigInt(cell);
      }
    }
    if (unknown !== null) {
      return {
        value: null,
        reason: t('Unknown because {{category}} has an unknown amount.', {
          category: unknown,
        }),
      };
    }
    if (sum > MAX || sum < -MAX) {
      return {
        value: null,
        reason: t('An amount exceeds supported bounds.'),
      };
    }
    return { value: Number(sum), reason: null };
  };
  return {
    budgeted: total('budgeted'),
    spent: total('spent'),
    balance: total('balance'),
  };
}

/** One group total; an unknown one names its reason. */
export function GroupAmount({
  total,
  style,
}: {
  total: GroupTotal;
  style?: CSSProperties;
}) {
  return (
    <View title={total.reason ?? undefined}>
      <Amount value={total.value} style={style} />
    </View>
  );
}
