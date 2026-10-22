import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type {
  CategoryPocketsMonth,
  PocketMonth,
} from '@actual-app/core/server/budget/pocket-readers';
import * as monthUtils from '@actual-app/core/shared/months';
import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import {
  Amount,
  GroupAmount,
  NativeAmount,
  PocketLabels,
  useOpenPocket,
  usePocketLabels,
  useSlotName,
} from '#components/budget/pocketDisplay';
import type { GroupTotals } from '#components/budget/pocketDisplay';
import { usePocketBacking } from '#hooks/useCategoryPockets';
import type { PocketBacking } from '#hooks/useCategoryPockets';
import { useLocalPref } from '#hooks/useLocalPref';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';

type Columns = { show3Columns: boolean; showBudgetedColumn: boolean };

/** Three amounts in the budget table's columns, as the category cells lay them out. */
function AmountColumns({
  show3Columns,
  showBudgetedColumn,
  amounts,
}: Columns & { amounts: [ReactNode, ReactNode, ReactNode] }) {
  const width = getColumnWidth({ show3Columns });
  const shown = [
    show3Columns || showBudgetedColumn,
    show3Columns || !showBudgetedColumn,
    true,
  ];
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
      {amounts.map((amount, index) => (
        <View
          key={index}
          style={{
            ...(!shown[index] && { display: 'none' }),
            width,
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingRight: 5,
          }}
        >
          {amount}
        </View>
      ))}
    </View>
  );
}

/** A category with pockets: its totals in the budget currency, read only. */
export function PocketParentCells({
  entry,
  ...columns
}: Columns & { entry: CategoryPocketsMonth }) {
  const { t } = useTranslation();
  return (
    <View role="group" aria-label={t('Category totals in the budget currency')}>
      <AmountColumns
        {...columns}
        amounts={[
          <Amount value={entry.budgeted} style={amountStyle} />,
          <Amount value={entry.spent} style={amountStyle} />,
          <Amount value={entry.balance} style={amountStyle} />,
        ]}
      />
    </View>
  );
}

const amountStyle: CSSProperties = { ...styles.smallText, fontWeight: 600 };

/** A group with pocket categories: the sum of what they display, read only. */
export function PocketGroupCells({
  group,
  totals,
  ...columns
}: Columns & { group: CategoryGroupEntity; totals: GroupTotals }) {
  const { t } = useTranslation();
  return (
    <View
      role="group"
      aria-label={t('{{group}} totals', { group: group.name })}
      style={{ paddingRight: 5 }}
    >
      <AmountColumns
        {...columns}
        amounts={[
          <GroupAmount total={totals.budgeted} style={groupAmountStyle} />,
          <GroupAmount total={totals.spent} style={groupAmountStyle} />,
          <GroupAmount total={totals.balance} style={groupAmountStyle} />,
        ]}
      />
    </View>
  );
}

const groupAmountStyle: CSSProperties = { fontSize: 12, fontWeight: 500 };

function childRowStyle(month: string): CSSProperties {
  return {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 5,
    borderBottomWidth: 1,
    borderColor: theme.tableBorder,
    backgroundColor: monthUtils.isCurrentMonth(month)
      ? theme.budgetCurrentMonth
      : theme.budgetOtherMonth,
  };
}

/**
 * The base slot (editable budget-currency cells) and each currency slot of
 * a category with pockets. A currency slot opens its details and actions.
 */
export function PocketSlotRows({
  category,
  month,
  entry,
  baseCells,
  ...columns
}: Columns & {
  category: CategoryEntity;
  month: string;
  entry: CategoryPocketsMonth;
  baseCells: ReactNode;
}) {
  const [budgetCurrency = ''] = useSyncedPref('defaultCurrencyCode');
  const [showHidden = false] = useLocalPref('budget.showHiddenCategories');
  const backing = usePocketBacking(month);
  return (
    <>
      {/* A reader without the field predates base visibility: shown. */}
      {(entry.baseSlot?.shown ?? true) && (
        <View style={childRowStyle(month)}>
          <Text style={labelStyle}>{budgetCurrency}</Text>
          {baseCells}
        </View>
      )}
      {entry.pockets
        .filter(pocket => showHidden || !pocket.hidden)
        .map(pocket => (
          <SlotRow
            key={pocket.id}
            category={category}
            month={month}
            pocket={pocket}
            backing={backing.get(pocket.currency)}
            {...columns}
          />
        ))}
    </>
  );
}

const labelStyle: CSSProperties = {
  ...styles.smallText,
  color: theme.pageTextSubdued,
};

function SlotRow({
  category,
  month,
  pocket,
  backing,
  ...columns
}: Columns & {
  category: CategoryEntity;
  month: string;
  pocket: PocketMonth;
  backing: PocketBacking | undefined;
}) {
  const { t } = useTranslation();
  const name = useSlotName(category.name, pocket.currency, month);
  const labels = usePocketLabels(pocket, backing);
  const openPocket = useOpenPocket();
  const native = (value: number | null) => (
    <NativeAmount
      value={value}
      currency={pocket.currency}
      precision={pocket.precision}
      style={styles.smallText}
    />
  );
  return (
    <Button
      variant="bare"
      aria-label={t('Details and actions for {{name}}', { name })}
      onPress={() => openPocket(category.id, pocket.id, month)}
      style={{
        ...childRowStyle(month),
        width: '100%',
        borderRadius: 0,
        opacity: pocket.hidden ? 0.5 : undefined,
      }}
    >
      <View style={{ alignItems: 'flex-start' }}>
        <Text style={labelStyle}>{pocket.currency}</Text>
        <PocketLabels labels={labels} />
      </View>
      <AmountColumns
        {...columns}
        amounts={[
          native(pocket.budgeted),
          native(pocket.spent),
          native(pocket.balance),
        ]}
      />
    </Button>
  );
}
