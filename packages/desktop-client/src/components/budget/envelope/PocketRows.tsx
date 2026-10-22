import type { ComponentProps, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { TextOneLine } from '@actual-app/components/text-one-line';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryPocketsMonth,
  PocketMonth,
} from '@actual-app/core/server/budget/pocket-readers';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CategoryEntity } from '@actual-app/core/types/models';

import {
  Amount,
  GroupAmount,
  NativeAmount,
  PocketLabels,
  useOpenPocket,
  usePocketGroupTotals,
  usePocketLabels,
  useSlotName,
} from '#components/budget/pocketDisplay';
import { RenderMonths } from '#components/budget/RenderMonths';
import { Field, Row } from '#components/table';
import {
  useCategoryPockets,
  usePocketBacking,
} from '#hooks/useCategoryPockets';
import type {
  CategorySlots,
  PocketBacking,
  PocketSlot,
} from '#hooks/useCategoryPockets';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useBudgetComponents } from '..';

/**
 * The rows under a category with pockets: its base slot when shown, then
 * each currency slot, hidden ones only while hidden rows show.
 */
export function slotRows(
  category: CategorySlots | undefined,
  showHidden: boolean,
): Array<{ type: 'base-slot' } | { type: 'pocket-slot'; slot: PocketSlot }> {
  if (!category) return [];
  return [
    ...(category.baseShown ? [{ type: 'base-slot' as const }] : []),
    ...category.slots
      .filter(slot => showHidden || !slot.hidden)
      .map(slot => ({ type: 'pocket-slot' as const, slot })),
  ];
}

const amountFields = ['budgeted', 'spent', 'balance'] as const;

function fieldStyle(name: (typeof amountFields)[number]): CSSProperties {
  return {
    textAlign: 'right',
    ...(name === 'balance' && { paddingRight: styles.monthRightPadding }),
  };
}

function monthStyle(month: string): CSSProperties {
  return {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: monthUtils.isCurrentMonth(month)
      ? theme.budgetCurrentMonth
      : theme.budgetOtherMonth,
  };
}

/** A category with pockets: its totals in the budget currency, read only. */
export function PocketParentMonth({
  entry,
  month,
}: {
  entry: CategoryPocketsMonth;
  month?: string;
}) {
  const { t } = useTranslation();
  return (
    <View
      role="group"
      aria-label={t('Category totals in the budget currency')}
      style={month ? monthStyle(month) : { flex: 1, flexDirection: 'row' }}
    >
      {amountFields.map(name => (
        <Field key={name} name={name} width="flex" style={fieldStyle(name)}>
          <Amount value={entry[name]} style={{ fontWeight: 600 }} />
        </Field>
      ))}
    </View>
  );
}

type MonthComponent = ReturnType<
  typeof useBudgetComponents
>['ExpenseCategoryComponent'];

/**
 * A category's month in its own row. With currency pockets in any visible
 * month its totals are read only, and only its base slot row edits, so a
 * month the reader has no entry for stays empty here.
 */
export function CategoryParentMonth({
  MonthComponent,
  hasPockets,
  ...props
}: ComponentProps<MonthComponent> & {
  MonthComponent: MonthComponent;
  hasPockets: boolean;
}) {
  const entry = useCategoryPockets(props.month).get(props.category.id);
  if (entry) return <PocketParentMonth entry={entry} month={props.month} />;
  if (hasPockets) return <View style={monthStyle(props.month)} />;
  return <MonthComponent {...props} />;
}

type GroupMonthComponent = ReturnType<
  typeof useBudgetComponents
>['ExpenseGroupComponent'];

/**
 * A group's month: with pocket categories, the sum of what its categories
 * display (read only); otherwise its existing cells.
 */
export function CategoryGroupMonth({
  MonthComponent,
  ...props
}: ComponentProps<GroupMonthComponent> & {
  MonthComponent: GroupMonthComponent;
}) {
  const { t } = useTranslation();
  const totals = usePocketGroupTotals(props.group, props.month);
  if (!totals) return <MonthComponent {...props} />;
  return (
    <View
      role="group"
      aria-label={t('{{group}} totals', { group: props.group.name })}
      style={{
        ...monthStyle(props.month),
        backgroundColor: monthUtils.isCurrentMonth(props.month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      {amountFields.map(name => (
        <Field key={name} name={name} width="flex" style={fieldStyle(name)}>
          <GroupAmount total={totals[name]} style={{ fontWeight: 600 }} />
        </Field>
      ))}
    </View>
  );
}

/** A currency slot's month in native units, with its state labels. */
export function PocketSlotMonth({
  categoryId,
  categoryName,
  month,
  pocket,
  backing,
}: {
  categoryId: string;
  categoryName: string;
  month: string;
  pocket: PocketMonth;
  backing: PocketBacking | undefined;
}) {
  const { t } = useTranslation();
  const name = useSlotName(categoryName, pocket.currency, month);
  const labels = usePocketLabels(pocket, backing);
  const openPocket = useOpenPocket();
  const native = (value: number | null) => (
    <NativeAmount
      value={value}
      currency={pocket.currency}
      precision={pocket.precision}
    />
  );
  return (
    <View role="group" aria-label={name} style={monthStyle(month)}>
      <Field name="budgeted" width="flex" style={fieldStyle('budgeted')}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <PocketLabels labels={labels} />
          {native(pocket.budgeted)}
        </View>
      </Field>
      <Field name="spent" width="flex" style={fieldStyle('spent')}>
        {native(pocket.spent)}
      </Field>
      <Field name="balance" width="flex" style={fieldStyle('balance')}>
        <Button
          variant="bare"
          aria-label={t('Details and actions for {{name}}', { name })}
          onPress={() => openPocket(categoryId, pocket.id, month)}
          style={{ justifyContent: 'flex-end', width: '100%', padding: 0 }}
        >
          {native(pocket.balance)}
        </Button>
      </Field>
    </View>
  );
}

function SlotSidebar({ label }: { label: string }) {
  const [expanded] = useGlobalPref('categoryExpandedState');
  return (
    <View
      style={{
        width: 200 + 100 * (expanded ?? 0),
        justifyContent: 'center',
        paddingLeft: 26,
        color: theme.pageTextSubdued,
      }}
    >
      <TextOneLine>{label}</TextOneLine>
    </View>
  );
}

type BaseSlotRowProps = {
  category: CategoryEntity;
  editingCell: { id: string; cell: string } | null;
  onEditMonth: (id: CategoryEntity['id'], month: string) => void;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};

/**
 * The base slot of a category with pockets: the category's own lane in the
 * budget currency, edited exactly as an ordinary category.
 */
export function BaseSlotRow({
  category,
  editingCell,
  onEditMonth,
  onBudgetAction,
  onShowActivity,
}: BaseSlotRowProps) {
  const [budgetCurrency = ''] = useSyncedPref('defaultCurrencyCode');
  const { ExpenseCategoryComponent: MonthComponent } = useBudgetComponents();
  return (
    <Row collapsed style={{ backgroundColor: theme.budgetCurrentMonth }}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SlotSidebar label={budgetCurrency} />
        <RenderMonths>
          {({ month }) => (
            <MonthComponent
              month={month}
              category={category}
              editing={
                editingCell?.id === category.id && editingCell.cell === month
              }
              // An empty id ends editing, as an ordinary category's null does.
              onEdit={(id, m) => onEditMonth(id ?? '', m ?? month)}
              onBudgetAction={onBudgetAction}
              onShowActivity={onShowActivity}
            />
          )}
        </RenderMonths>
      </View>
    </Row>
  );
}

/** A currency slot of a category: one row across the visible months. */
export function PocketSlotRow({
  category,
  slot,
}: {
  category: CategoryEntity;
  slot: PocketSlot;
}) {
  return (
    <Row
      collapsed
      style={{
        backgroundColor: theme.budgetCurrentMonth,
        opacity: slot.hidden ? 0.5 : undefined,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <SlotSidebar label={slot.currency} />
        <RenderMonths>
          {({ month }) => (
            <SlotMonth category={category} slotId={slot.id} month={month} />
          )}
        </RenderMonths>
      </View>
    </Row>
  );
}

function SlotMonth({
  category,
  slotId,
  month,
}: {
  category: CategoryEntity;
  slotId: string;
  month: string;
}) {
  const pocket = useCategoryPockets(month)
    .get(category.id)
    ?.pockets.find(p => p.id === slotId);
  const backing = usePocketBacking(month).get(pocket?.currency ?? '');
  // A slot without lanes in this month shows nothing there.
  if (!pocket) return <View style={monthStyle(month)} />;
  return (
    <PocketSlotMonth
      categoryId={category.id}
      categoryName={category.name}
      month={month}
      pocket={pocket}
      backing={backing}
    />
  );
}
