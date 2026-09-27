import React, {
  createContext,
  memo,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Trans } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import {
  SvgArrowButtonDown1,
  SvgArrowButtonSingleDown1,
  SvgArrowButtonSingleUp1,
  SvgArrowButtonUp1,
} from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import {
  amountToInteger,
  currencyToAmount,
  integerToCurrency,
} from '@actual-app/core/shared/util';
import type {
  AccountEntity,
  CategoryEntity,
  CategoryGroupEntity,
  CSPCategoryEntity,
} from '@actual-app/core/types/models';
import { css } from '@emotion/css';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  useDeleteCspCategoryGroupMutation,
  useDeleteCspCategoryMutation,
  useReorderCspCategoryMutation,
  useSaveCspCategoryGroupMutation,
  useSaveCspCategoryMutation,
} from '#budget';
import type {
  BudgetComponents,
  BudgetSummaryProps,
  CategoryGroupMonthProps,
  CategoryMonthProps,
} from '#components/budget';
import {
  CategoriesOverrideProvider,
  useCategoriesOverride,
} from '#components/budget/CategoriesOverrideContext';
import { ClickableCell } from '#components/budget/ClickableCell';
import { AutoSizingBudgetTable } from '#components/budget/DynamicBudgetTable';
import { EnvelopeBudgetProvider } from '#components/budget/envelope/EnvelopeBudgetContext';
import { TrackingBudgetProvider } from '#components/budget/tracking/TrackingBudgetContext';
import {
  makeAmountGrey,
  prewarmAllMonths,
  prewarmMonth,
} from '#components/budget/util';
import { Field, InputCell } from '#components/table';
import { useAccounts } from '#hooks/useAccounts';
import { useCspCategories } from '#hooks/useCspCategories';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocale } from '#hooks/useLocale';
import { useLocalPref } from '#hooks/useLocalPref';
import { useNavigate } from '#hooks/useNavigate';
import { SheetNameProvider } from '#hooks/useSheetName';
import { useSpreadsheet } from '#hooks/useSpreadsheet';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CspAuditsContext } from './CspAuditsContext';
import type { CspAudit } from './CspAuditsContext';
import { CspComponentsProvider } from './CspComponentsContext';

// ---------------------------------------------------------------------------
// CSP Actuals context – provides per-category spent amounts for a month
// ---------------------------------------------------------------------------

type CspActuals = Record<string, number>;

export const CspActualsContext = createContext<CspActuals>({});
export const CspTargetsContext = createContext<Record<string, number>>({});

export const isIncomeCategory = (
  cat: CategoryEntity,
  categoryGroups: CategoryGroupEntity[],
) => {
  const group = categoryGroups.find(g => g.id === cat.group);
  return group ? group.name.toLowerCase().includes('income') : false;
};

export const getCspTargetAmount = (
  cat: CategoryEntity,
  categoryGroups: CategoryGroupEntity[],
  targets: Record<string, number>,
) => {
  const group = categoryGroups.find(g => g.id === cat.group);
  const isGuiltFree = group && group.name.toLowerCase().includes('guilt-free');

  let plannedAmount = targets[cat.id];

  // The first Guilt-Free category is always automatic
  let automaticCategoryId: string | null = null;
  const guiltFreeGroup = categoryGroups.find(g =>
    g.name.toLowerCase().includes('guilt-free'),
  );
  if (
    guiltFreeGroup &&
    guiltFreeGroup.categories &&
    guiltFreeGroup.categories.length > 0
  ) {
    automaticCategoryId = guiltFreeGroup.categories[0].id;
  }

  if (isGuiltFree && cat.id === automaticCategoryId) {
    let totalIncome = 0;
    let totalOtherAllocated = 0;

    for (const g of categoryGroups) {
      const gIsIncome = g.name.toLowerCase().includes('income');

      for (const c of g.categories ?? []) {
        const cTarget = Math.abs(targets[c.id] ?? 0);

        if (gIsIncome) {
          totalIncome += cTarget;
        } else if (c.id !== automaticCategoryId) {
          totalOtherAllocated += cTarget;
        }
      }
    }

    const remainder = totalIncome - totalOtherAllocated;
    plannedAmount = Math.max(0, remainder);
  }

  if (plannedAmount != null) {
    return Math.abs(plannedAmount);
  }
  return 0;
};

export const getCspSpentAmount = (
  cat: CategoryEntity,
  actuals: Record<string, number>,
  audits: Record<string, CspAudit>,
  _categoryGroups?: CategoryGroupEntity[],
) => {
  const auditPeriod = (cat as CSPCategoryEntity).moving_average_months;
  if (auditPeriod != null && auditPeriod > 0) {
    const avg = audits[cat.id]?.average ?? 0;
    return Math.abs(avg);
  }
  return Math.abs(actuals[cat.id] ?? 0);
};

export function calculateForwardAmortization(
  monthlySums: Record<string, number>,
  periodMonths: number,
): Record<string, number> {
  const sortedMonths = Object.keys(monthlySums).sort();

  let lastCoveredMonth: string | null = null;
  const monthlyAllocation: Record<string, number> = {};

  for (const m of sortedMonths) {
    const totalAmount = Math.abs(monthlySums[m] || 0);
    if (totalAmount === 0) continue;

    const monthlyAmount = Math.round(totalAmount / periodMonths);

    // If this payment was made in the final month of the previous coverage period,
    // it's an early renewal (e.g. paying July-Dec bill on June 28 when June is the 6th month of Jan-Jun).
    // Automatically queue it to start the following month (July) so it doesn't double-count!
    let startMonth = m;
    if (lastCoveredMonth && m === lastCoveredMonth) {
      startMonth = monthUtils.addMonths(lastCoveredMonth, 1);
    }

    const endMonth = monthUtils.addMonths(startMonth, periodMonths - 1);
    if (!lastCoveredMonth || endMonth > lastCoveredMonth) {
      lastCoveredMonth = endMonth;
    }

    let cursor = startMonth;
    for (let i = 0; i < periodMonths; i++) {
      monthlyAllocation[cursor] =
        (monthlyAllocation[cursor] || 0) + monthlyAmount;
      cursor = monthUtils.addMonths(cursor, 1);
    }
  }

  return monthlyAllocation;
}

export function useCspCategoryAudits(
  month: string,
  categories: CSPCategoryEntity[],
  budgetStartMonth?: string,
) {
  const categoryHash = categories
    .map(c => `${c.id}:${c.moving_average_months}`)
    .join(',');

  return useQuery({
    queryKey: ['csp-category-audits', month, categoryHash, budgetStartMonth],
    queryFn: async () => {
      const amortizedCats = categories.filter(
        c => c.moving_average_months != null && c.moving_average_months > 0,
      );

      if (amortizedCats.length === 0) {
        return {};
      }

      let maxWindow = 12;
      amortizedCats.forEach(c => {
        if (
          c.moving_average_months != null &&
          c.moving_average_months > maxWindow
        ) {
          maxWindow = c.moving_average_months;
        }
      });

      // Look back far enough to catch any previous coverage period that chains into `month`.
      // Up to maxWindow * 2 months back (e.g. 24 or 48 months), or budgetStartMonth.
      const earliestStartMonth = budgetStartMonth
        ? budgetStartMonth
        : monthUtils.subMonths(month, maxWindow * 2);

      const amortizedCatIds = amortizedCats.map(c => c.id);

      const { data } = await send(
        'query',
        q('transactions')
          .filter({
            tombstone: false,
            'account.offbudget': false,
            csp_category: { $oneof: amortizedCatIds },
            date: {
              $transform: '$month',
              $gte: earliestStartMonth,
              $lte: month,
            },
          })
          .select([
            'id',
            'date',
            'csp_category',
            { month: { $month: '$date' } },
            'amount',
            'transfer_id',
          ])
          .serialize(),
      );

      const sumsByCatAndMonth: Record<string, Record<string, number>> = {};
      for (const row of data) {
        const catId = row.csp_category;
        if (!sumsByCatAndMonth[catId]) {
          sumsByCatAndMonth[catId] = {};
        }
        sumsByCatAndMonth[catId][row.month] =
          (sumsByCatAndMonth[catId][row.month] || 0) + row.amount;
      }

      const audits: Record<string, CspAudit> = {};

      for (const cat of amortizedCats) {
        const N = cat.moving_average_months || 12;
        const catMonths = sumsByCatAndMonth[cat.id] || {};
        const monthlyAllocation = calculateForwardAmortization(catMonths, N);
        const actualAmount = monthlyAllocation[month] || 0;

        audits[cat.id] = {
          average: actualAmount,
          deviation: 0,
          flag: null,
        };
      }

      return audits;
    },
    placeholderData: {},
    enabled: !!month && categories.length > 0,
  });
}

export function useCspActualsForMonth(month: string) {
  return useQuery({
    queryKey: ['csp-actuals', month],
    queryFn: async () => {
      const { data } = await send(
        'query',
        q('transactions')
          .filter({
            date: { $transform: '$month', $eq: month },
            tombstone: false,
            'account.offbudget': false,
            csp_category: { $ne: null },
          })
          .select(['csp_category', 'amount', 'transfer_id'])
          .serialize(),
      );
      const res: CspActuals = {};

      for (const row of data) {
        const amount = row.amount;
        res[row.csp_category] = (res[row.csp_category] || 0) + amount;
      }

      return res;
    },
    placeholderData: {},
    enabled: !!month,
  });
}
export function useCspTargetsForMonth(month: string) {
  return useQuery({
    queryKey: ['csp-targets', month],
    queryFn: async () => {
      const targets = await send('csp/get-targets', { month });
      return targets as Record<string, number>;
    },
    placeholderData: {},
    enabled: !!month,
  });
}

// Re-export for convenience
export { useCspBudgetComponents } from './CspComponentsContext';

// ---------------------------------------------------------------------------
// CSP month-cell components (plugged in place of envelope/tracking ones)
// ---------------------------------------------------------------------------

function getDeviationStyles(
  targetAmount?: number,
  spentAmount?: number,
  isIncome?: boolean,
) {
  let devColor: string | null = null;
  let ArrowIcon = null;

  if (targetAmount != null && spentAmount != null && targetAmount !== 0) {
    const absSpent = Math.abs(spentAmount);
    const absTarget = Math.abs(targetAmount);
    const deviation = (absSpent - absTarget) / absTarget;

    if (deviation >= 0.1) {
      devColor = isIncome ? theme.noticeText : theme.errorText; // Green or Red
      ArrowIcon = SvgArrowButtonUp1;
    } else if (deviation >= 0.05) {
      devColor = isIncome ? theme.noticeTextLight : theme.warningText; // Light Green or Orange
      ArrowIcon = SvgArrowButtonSingleUp1;
    } else if (deviation <= -0.1) {
      devColor = isIncome ? theme.errorText : '#0055cc'; // Red or Blue
      ArrowIcon = SvgArrowButtonDown1;
    } else if (deviation <= -0.05) {
      devColor = isIncome ? theme.warningText : '#3399ff'; // Orange or Light Blue
      ArrowIcon = SvgArrowButtonSingleDown1;
    }
  }

  return { devColor, ArrowIcon };
}

export function CspAmountCell({
  amount,
  percentage,
  dimIfZero,
  targetAmount,
  spentAmount,
  isIncome,
}: {
  amount: number;
  percentage?: number;
  dimIfZero?: boolean;
  targetAmount?: number;
  spentAmount?: number;
  isIncome?: boolean;
}) {
  const absAmount = Math.abs(amount);
  const formatted = integerToCurrency(absAmount);

  const { devColor, ArrowIcon } = getDeviationStyles(
    targetAmount,
    spentAmount,
    isIncome,
  );

  const defaultColorStyle = makeAmountGrey(absAmount) ?? {
    color: devColor ?? theme.tableText,
  };

  const colorStyle =
    dimIfZero && absAmount === 0
      ? { color: theme.pageTextSubdued }
      : defaultColorStyle;

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      {percentage !== undefined && (
        <Text
          style={{
            fontSize: 11,
            color: theme.pageTextSubdued,
            marginRight: 6,
          }}
        >
          {percentage.toFixed(1)}%
        </Text>
      )}
      {ArrowIcon && (
        <ArrowIcon
          width={10}
          height={10}
          style={{
            color: devColor ?? theme.pageTextSubdued,
            marginRight: 2,
          }}
        />
      )}
      <Text style={{ ...styles.tnum, textAlign: 'right', ...colorStyle }}>
        {formatted}
      </Text>
    </View>
  );
}

export type CspNetIncomeInfo = { target: number; spent: number };
export const CspNetIncomeContext = createContext<CspNetIncomeInfo>({
  target: 0,
  spent: 0,
});

export function useCspMonthData(month?: string) {
  const contextActuals = useContext(CspActualsContext);
  const contextTargets = useContext(CspTargetsContext);
  const contextAudits = useContext(CspAuditsContext);
  const contextNetIncome = useContext(CspNetIncomeContext);

  const { data: monthActuals = {} } = useCspActualsForMonth(month ?? '');
  const { data: monthTargets = {} } = useCspTargetsForMonth(month ?? '');
  const { data: categoriesData } = useCspCategories();
  const categoryGroups = useCategoriesOverride() || [];
  const { data: monthAudits = {} } = useCspCategoryAudits(
    month ?? '',
    categoriesData?.list ?? [],
  );

  if (!month) {
    return {
      actuals: contextActuals,
      targets: contextTargets,
      audits: contextAudits,
      netIncome: contextNetIncome,
      categoryGroups,
    };
  }

  const actuals = monthActuals;
  const targets = monthTargets;
  const audits = monthAudits;

  const incomeGroup = categoryGroups.find(g =>
    g.name.toLowerCase().includes('income'),
  );

  const netIncomeTarget = incomeGroup
    ? (incomeGroup.categories ?? []).reduce(
        (sum, cat) => sum + getCspTargetAmount(cat, categoryGroups, targets),
        0,
      )
    : 0;
  const netIncomeSpent = incomeGroup
    ? (incomeGroup.categories ?? []).reduce(
        (sum, cat) =>
          sum + getCspSpentAmount(cat, actuals, audits, categoryGroups),
        0,
      )
    : 0;

  return {
    actuals,
    targets,
    audits,
    netIncome: { target: netIncomeTarget, spent: netIncomeSpent },
    categoryGroups,
  };
}

export function useCspCategoryAmounts(
  category: CategoryEntity,
  month?: string,
) {
  const { actuals, audits, netIncome, categoryGroups, targets } =
    useCspMonthData(month);

  const targetAmount = getCspTargetAmount(category, categoryGroups, targets);
  const spentAmount = getCspSpentAmount(
    category,
    actuals,
    audits,
    categoryGroups,
  );
  const isIncome = isIncomeCategory(category, categoryGroups);

  const guiltFreeGroup = categoryGroups.find(g =>
    g.name.toLowerCase().includes('guilt-free'),
  );
  const isAutomatic =
    !!guiltFreeGroup &&
    !!guiltFreeGroup.categories?.length &&
    guiltFreeGroup.categories[0].id === category.id;

  const targetPercentage =
    netIncome.target > 0 ? (targetAmount / netIncome.target) * 100 : undefined;
  const spentPercentage =
    netIncome.spent > 0
      ? (Math.abs(spentAmount) / netIncome.spent) * 100
      : undefined;

  return {
    targetAmount,
    spentAmount,
    targetPercentage,
    spentPercentage,
    isIncome,
    isAutomatic,
  };
}

export function useCspGroupAmounts(group: CategoryGroupEntity, month?: string) {
  const { actuals, audits, netIncome, categoryGroups, targets } =
    useCspMonthData(month);

  const totalTarget = (group.categories ?? []).reduce(
    (sum, cat) => sum + getCspTargetAmount(cat, categoryGroups, targets),
    0,
  );
  const totalSpent = (group.categories ?? []).reduce(
    (sum, cat) => sum + getCspSpentAmount(cat, actuals, audits, categoryGroups),
    0,
  );

  const isIncome = group.name.toLowerCase().includes('income');

  const targetPercentage =
    netIncome.target > 0 && !isIncome
      ? (totalTarget / netIncome.target) * 100
      : undefined;
  const spentPercentage =
    netIncome.spent > 0 && !isIncome
      ? (Math.abs(totalSpent) / netIncome.spent) * 100
      : undefined;

  return {
    totalTarget,
    totalSpent,
    targetPercentage,
    spentPercentage,
    isIncome,
  };
}

const CspCategoryMonth = memo(function CspCategoryMonth({
  category,
  isLast,
  month,
  editing,
  onEdit,
  onShowActivity,
}: CategoryMonthProps) {
  const queryClient = useQueryClient();
  const {
    targetAmount,
    spentAmount,
    targetPercentage,
    spentPercentage,
    isIncome,
    isAutomatic,
  } = useCspCategoryAmounts(category, month);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.budgetCurrentMonth,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible, & .force-visible .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
        }}
      >
        <InputCell
          name="target"
          width="flex"
          style={{
            textAlign: 'right',
            ...(isLast && { borderBottomWidth: 0 }),
          }}
          exposed={editing && !isAutomatic}
          focused={editing && !isAutomatic}
          onExpose={() => !isAutomatic && onEdit(category.id, month)}
          onBlur={() => !isAutomatic && onEdit(null)}
          valueStyle={{
            cursor: isAutomatic ? 'default' : 'text',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ...(isAutomatic
              ? {}
              : {
                  ':hover': {
                    boxShadow: 'inset 0 0 0 1px ' + theme.pageTextSubdued,
                    backgroundColor: theme.budgetCurrentMonth,
                  },
                }),
          }}
          value={targetAmount === null ? '' : integerToCurrency(targetAmount)}
          formatter={() => (
            <CspAmountCell
              amount={targetAmount}
              percentage={targetPercentage}
              dimIfZero
            />
          )}
          onUpdate={async value => {
            if (isAutomatic) return;
            const parsed = value ? currencyToAmount(value) : null;
            const newAmount =
              parsed !== null && !isNaN(parsed)
                ? Math.abs(amountToInteger(parsed))
                : null;
            if (newAmount !== targetAmount) {
              await send('csp/set-target', {
                month,
                category: category.id,
                amount: newAmount,
              });
              void queryClient.invalidateQueries({ queryKey: ['csp-targets'] });
            }
          }}
        />
      </View>
      <Field
        name="spent"
        width="flex"
        style={{
          textAlign: 'right',
          ...(isLast && { borderBottomWidth: 0 }),
        }}
      >
        <ClickableCell
          onClick={() => onShowActivity(category.id, month, 'csp_category')}
        >
          <CspAmountCell
            amount={spentAmount}
            percentage={spentPercentage}
            dimIfZero
            targetAmount={targetAmount}
            spentAmount={spentAmount}
            isIncome={isIncome}
          />
        </ClickableCell>
      </Field>
    </View>
  );
});

const CspGroupMonth = memo(function CspGroupMonth({
  group,
  month,
  onShowActivity,
}: CategoryGroupMonthProps) {
  const {
    totalTarget,
    totalSpent,
    targetPercentage,
    spentPercentage,
    isIncome,
  } = useCspGroupAmounts(group, month);

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: theme.budgetHeaderCurrentMonth,
      }}
    >
      <Field
        name="target"
        width="flex"
        style={{
          textAlign: 'right',
          fontWeight: 600,
        }}
      >
        <ClickableCell
          style={{ paddingRight: styles.monthRightPadding }}
          onClick={() => onShowActivity(group.id, month, 'csp_category_group')}
        >
          <CspAmountCell
            amount={totalTarget}
            percentage={targetPercentage}
            dimIfZero
            isIncome={isIncome}
          />
        </ClickableCell>
      </Field>
      <Field
        name="spent"
        width="flex"
        style={{
          textAlign: 'right',
          fontWeight: 600,
        }}
      >
        <ClickableCell
          style={{ paddingRight: styles.monthRightPadding }}
          onClick={() => onShowActivity(group.id, month, 'csp_category_group')}
        >
          <CspAmountCell
            amount={totalSpent}
            percentage={spentPercentage}
            dimIfZero
            targetAmount={totalTarget}
            spentAmount={totalSpent}
            isIncome={isIncome}
          />
        </ClickableCell>
      </Field>
    </View>
  );
});

const CspHeaderMonth = memo(function CspHeaderMonth() {
  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        marginRight: styles.monthRightPadding,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: theme.budgetCurrentMonth,
      }}
    >
      <View style={{ flex: 1, padding: '0 5px', textAlign: 'right' }}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Planned</Trans>
        </Text>
      </View>
      <View style={{ flex: 1, padding: '0 5px', textAlign: 'right' }}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Actual</Trans>
        </Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Net Worth Component
// ---------------------------------------------------------------------------

export type AccountGroupRowProps = {
  layout?: 'row-between' | 'row-center';
  label: ReactNode;
  amount: number;
  accounts: AccountEntity[];
  balances: Record<string, number>;
};

export function AccountGroupRow({
  layout = 'row-between',
  label,
  amount,
  accounts,
  balances,
}: AccountGroupRowProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View
      style={
        layout === 'row-between'
          ? {
              borderBottomWidth: 1,
              borderBottomStyle: 'solid',
              borderColor: theme.tableBorder,
            }
          : undefined
      }
    >
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => setIsOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: layout === 'row-between' ? '10px 0' : '2px 8px',
          borderRadius: 4,
          width: '100%',
          justifyContent: layout === 'row-between' ? 'space-between' : 'center',
        }}
      >
        {layout === 'row-between' ? (
          <>
            <Text style={{ fontWeight: 500 }}>{label}</Text>
            <Text
              style={{
                ...styles.tnum,
                fontWeight: 500,
                color: amount < 0 ? theme.errorText : theme.tableText,
              }}
            >
              {integerToCurrency(amount)}
            </Text>
          </>
        ) : (
          <>
            <Text
              style={{
                textAlign: 'right',
                marginRight: 10,
                minWidth: 70,
                fontWeight: 600,
                ...styles.tnum,
                color: amount < 0 ? theme.errorText : theme.tableText,
              }}
            >
              {integerToCurrency(amount)}
            </Text>
            <Text style={{ minWidth: 80, textAlign: 'left' }}>{label}</Text>
          </>
        )}
      </Button>

      {isOpen && (
        <Popover
          triggerRef={triggerRef}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          placement="bottom start"
          style={{
            padding: 12,
            minWidth: 220,
            maxWidth: 320,
          }}
        >
          <View style={{ gap: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderBottom: `1px solid ${theme.tableBorder}`,
                paddingBottom: 6,
                gap: 10,
              }}
            >
              <Text style={{ fontWeight: 'bold' }}>{label}</Text>
              <Text
                style={{
                  fontWeight: 'bold',
                  ...styles.tnum,
                  color: amount < 0 ? theme.errorText : theme.tableText,
                }}
              >
                {integerToCurrency(amount)}
              </Text>
            </View>
            {accounts.length === 0 ? (
              <Text
                style={{
                  fontStyle: 'italic',
                  color: theme.pageTextSubdued,
                  fontSize: 12,
                  padding: '4px 0',
                }}
              >
                <Trans>No accounts</Trans>
              </Text>
            ) : (
              <View style={{ gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                {accounts.map(acc => {
                  const bal = balances[acc.id] || 0;
                  return (
                    <View
                      key={acc.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: 12,
                        gap: 15,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={acc.name}
                      >
                        {acc.name}
                      </Text>
                      <Text
                        style={{
                          ...styles.tnum,
                          color: bal < 0 ? theme.errorText : theme.tableText,
                        }}
                      >
                        {integerToCurrency(bal)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </Popover>
      )}
    </View>
  );
}

function CspBudgetSummary({ month }: BudgetSummaryProps) {
  const currentMonth = monthUtils.currentMonth();
  const [collapsed, setCollapsed] = useLocalPref('budget.summaryCollapsed');
  const locale = useLocale();

  const [accountTypesRaw] = useSyncedPref('csp-account-types');
  const accountTypes = accountTypesRaw ? JSON.parse(accountTypesRaw) : {};

  const { data: accounts = [] } = useAccounts();
  const { data: balances = {} } = useQuery({
    queryKey: ['csp-balances', month],
    queryFn: async () => {
      const { data } = await send(
        'query',
        q('transactions')
          .filter({
            tombstone: false,
            date: { $lte: monthUtils.getMonthEnd(month) },
          })
          .groupBy('account')
          .select(['account', { sum: { $sum: '$amount' } }])
          .serialize(),
      );
      const res: Record<string, number> = {};
      data.forEach((row: { account: string; sum: number }) => {
        res[row.account] = row.sum;
      });
      return res;
    },
  });

  let savingsTotal = 0;
  let investmentsTotal = 0;
  let assetsTotal = 0;
  let debtTotal = 0;

  accounts
    .filter(a => !a.closed)
    .forEach(a => {
      const bal = balances[a.id] || 0;
      const type = accountTypes[a.id];

      if (type === 'savings') savingsTotal += bal;
      else if (type === 'investments') investmentsTotal += bal;
      else if (type === 'assets' || type === 'auto') assetsTotal += bal;
      else if (type === 'debt') debtTotal += bal;
    });

  const netWorth = savingsTotal + investmentsTotal + assetsTotal + debtTotal;

  const savingsAccounts = accounts.filter(
    a => !a.closed && accountTypes[a.id] === 'savings',
  );
  const investmentsAccounts = accounts.filter(
    a => !a.closed && accountTypes[a.id] === 'investments',
  );
  const assetsAccounts = accounts.filter(
    a =>
      !a.closed &&
      (accountTypes[a.id] === 'assets' || accountTypes[a.id] === 'auto'),
  );
  const debtAccounts = accounts.filter(
    a => !a.closed && accountTypes[a.id] === 'debt',
  );

  const ExpandOrCollapseIcon = collapsed
    ? SvgArrowButtonDown1
    : SvgArrowButtonUp1;

  function CspTotalNetWorth() {
    return (
      <View style={{ alignItems: 'center' }}>
        <Block>{netWorth < 0 ? 'NET DEBT:' : 'TOTAL NET WORTH:'}</Block>
        <View>
          <Block
            className={css([
              styles.veryLargeText,
              {
                fontWeight: 400,
                userSelect: 'none',
                color:
                  netWorth > 0
                    ? theme.toBudgetPositive
                    : netWorth < 0
                      ? theme.toBudgetNegative
                      : theme.toBudgetZero,
                marginBottom: -1,
              },
            ])}
          >
            {integerToCurrency(netWorth)}
          </Block>
        </View>
      </View>
    );
  }

  return (
    <View
      data-testid="csp-budget-summary"
      style={{
        backgroundColor:
          month === currentMonth
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        boxShadow: styles.cardShadow,
        borderRadius: 6,
        marginLeft: 0,
        marginRight: 0,
        marginTop: 5,
        flex: 1,
        cursor: 'default',
        marginBottom: 5,
        overflow: 'hidden',
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <View
        style={{
          padding: '0 13px',
          ...(collapsed ? { margin: '10px 0' } : { marginTop: 16 }),
        }}
      >
        <View style={{ position: 'absolute', left: 10, top: 0 }}>
          <Button
            variant="bare"
            className="hover-visible"
            onPress={() => setCollapsed(!collapsed)}
          >
            <ExpandOrCollapseIcon
              width={13}
              height={13}
              style={{ color: theme.pageTextLight, margin: 1 }}
            />
          </Button>
        </View>

        <div
          className={css([
            {
              textAlign: 'center',
              marginTop: 3,
              fontSize: 18,
              fontWeight: 500,
              textDecorationSkip: 'ink',
            },
            currentMonth === month && { fontWeight: 'bold' },
          ])}
        >
          {monthUtils.format(month, 'MMMM', locale)}
        </div>
      </View>

      {collapsed ? (
        <View
          style={{
            alignItems: 'center',
            padding: '10px 20px',
            justifyContent: 'space-between',
            backgroundColor: theme.budgetCurrentMonth,
            borderTop: '1px solid ' + theme.tableBorder,
          }}
        >
          <CspTotalNetWorth />
        </View>
      ) : (
        <>
          <View
            style={{
              flexDirection: 'column',
              lineHeight: 1.5,
              alignItems: 'center',
              ...styles.smallText,
              padding: '6px 0',
              marginTop: 17,
              backgroundColor: theme.budgetHeaderCurrentMonth,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.tableBorder,
              gap: 2,
            }}
          >
            <AccountGroupRow
              layout="row-center"
              label={<Trans>Assets</Trans>}
              amount={assetsTotal}
              accounts={assetsAccounts}
              balances={balances}
            />
            <AccountGroupRow
              layout="row-center"
              label={<Trans>Investments</Trans>}
              amount={investmentsTotal}
              accounts={investmentsAccounts}
              balances={balances}
            />
            <AccountGroupRow
              layout="row-center"
              label={<Trans>Savings</Trans>}
              amount={savingsTotal}
              accounts={savingsAccounts}
              balances={balances}
            />
            <AccountGroupRow
              layout="row-center"
              label={<Trans>Debt</Trans>}
              amount={debtTotal}
              accounts={debtAccounts}
              balances={balances}
            />
          </View>
          <View style={{ margin: '23px 0' }}>
            <CspTotalNetWorth />
          </View>
        </>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Adapt CSP categories → CategoryGroupEntity[] for BudgetTable reuse
// ---------------------------------------------------------------------------

export function useCspCategoryGroups(): CategoryGroupEntity[] {
  const { data: categoriesData } = useCspCategories();
  const { grouped = [] } = categoriesData ?? {};

  return useMemo(() => {
    // Filter out N/A Ignored and empty groups
    const filteredGroups = grouped
      .map(g => ({
        ...g,
        categories: (g.categories ?? []).filter(
          c => !c.name.includes('N/A') && !c.name.includes('Ignored'),
        ),
      }))
      .filter(
        g =>
          !g.name.includes('N/A') &&
          !g.name.includes('Ignored') &&
          g.categories.length > 0,
      );

    const mapped = filteredGroups.map(
      (g): CategoryGroupEntity => ({
        id: g.id,
        name: g.name,
        sort_order: g.sort_order,
        tombstone: g.tombstone,
        is_income: false, // Map them all as expense groups so they render consecutively in their custom order
        hidden: false,
        categories: (g.categories ?? []).map(
          (c): CategoryEntity => ({
            id: c.id,
            name: c.name,
            group: c.group,
            sort_order: c.sort_order,
            tombstone: c.tombstone,
            is_income: false,
            hidden: false,
            planned_amount: c.planned_amount,
            moving_average_months: c.moving_average_months,
          }),
        ),
      }),
    );

    // Sort income group to the top
    mapped.sort((a, b) => {
      const isAIncome = a.name.toLowerCase().includes('income');
      const isBIncome = b.name.toLowerCase().includes('income');
      if (isAIncome && !isBIncome) return -1;
      if (!isAIncome && isBIncome) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });

    return mapped;
  }, [grouped]);
}

// ---------------------------------------------------------------------------
// Csp page component – mirrors Budget page with CSP data
// ---------------------------------------------------------------------------

export function Csp() {
  const currentMonth = monthUtils.currentMonth();
  const spreadsheet = useSpreadsheet();
  const navigate = useNavigate();
  const [summaryCollapsed, setSummaryCollapsedPref] = useLocalPref(
    'budget.summaryCollapsed',
  );
  const [startMonthPref, setStartMonthPref] = useLocalPref('budget.startMonth');
  const startMonth = startMonthPref || currentMonth;
  const [bounds, setBounds] = useState({
    start: startMonth,
    end: startMonth,
  });
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const [maxMonthsPref] = useGlobalPref('maxMonths');
  const maxMonths = maxMonthsPref || 1;
  const [initialized, setInitialized] = useState(false);

  const categoryGroups = useCspCategoryGroups();

  const init = useEffectEvent(() => {
    async function run() {
      const { start, end } = await send('get-budget-bounds');
      setBounds({ start, end });

      await prewarmAllMonths(
        budgetType,
        spreadsheet,
        { start, end },
        startMonth,
      );

      setInitialized(true);
    }

    void run();
  });
  useEffect(() => init(), []);

  const loadBoundBudgets = useEffectEvent(() => {
    void send('get-budget-bounds').then(({ start, end }) => {
      if (bounds.start !== start || bounds.end !== end) {
        setBounds({ start, end });
      }
    });
  });
  useEffect(() => loadBoundBudgets(), []);

  const onMonthSelect = async (month: string, numDisplayed: number) => {
    setStartMonthPref(month);

    const warmingMonth = month;
    if (month < startMonth) {
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.subMonths(month, 1),
      );
    } else if (month > startMonth) {
      await prewarmMonth(
        budgetType,
        spreadsheet,
        monthUtils.addMonths(month, numDisplayed),
      );
    }

    if (warmingMonth === month) {
      setStartMonthPref(month);
    }
  };

  const onToggleCollapse = () => {
    setSummaryCollapsedPref(!summaryCollapsed);
  };

  const saveCategory = useSaveCspCategoryMutation();
  const deleteCategory = useDeleteCspCategoryMutation();
  const saveCategoryGroup = useSaveCspCategoryGroupMutation();
  const deleteCategoryGroup = useDeleteCspCategoryGroupMutation();
  const reorderCategory = useReorderCspCategoryMutation();

  // No-op handlers for budget-specific actions
  const noop = () => {
    /* no-op */
  };
  const noopBudgetAction = () => {
    /* no-op */
  };

  const onShowActivity = (
    categoryId: string,
    month?: string,
    field:
      | 'category'
      | 'category_group'
      | 'csp_category'
      | 'csp_category_group' = 'csp_category',
  ) => {
    const resolvedField =
      field === 'category_group'
        ? 'csp_category_group'
        : field === 'category'
          ? 'csp_category'
          : field;

    const cat =
      resolvedField === 'csp_category'
        ? categoryGroups
            .flatMap(g => g.categories ?? [])
            .find(c => c.id === categoryId)
        : null;
    const movingAverageMonths = (cat as CSPCategoryEntity | undefined)
      ?.moving_average_months;

    let dateConditions: Array<{
      field: string;
      op: string;
      value: unknown;
      options?: Record<string, unknown>;
      type: string;
    }> = [];

    if (month) {
      if (movingAverageMonths && movingAverageMonths > 1) {
        const catStartMonth = monthUtils.subMonths(month, movingAverageMonths);
        dateConditions = [
          {
            field: 'date',
            op: 'gte',
            value: monthUtils.firstDayOfMonth(catStartMonth),
            type: 'date',
          },
          {
            field: 'date',
            op: 'lte',
            value: monthUtils.lastDayOfMonth(month),
            type: 'date',
          },
        ];
      } else {
        dateConditions = [
          {
            field: 'date',
            op: 'is',
            value: month,
            options: { month: true },
            type: 'date',
          },
        ];
      }
    }

    const filterConditions = [
      { field: resolvedField, op: 'is', value: categoryId, type: 'id' },
      { field: 'account', op: 'onBudget', value: '' },
      ...dateConditions,
    ];

    void navigate('/accounts', {
      state: {
        goBack: true,
        filterConditions,
        categoryId,
        movingAverageMonths:
          movingAverageMonths && movingAverageMonths > 1
            ? movingAverageMonths
            : undefined,
      },
    });
  };

  // CSP-specific budget components
  const cspComponents = useMemo<BudgetComponents>(
    () => ({
      SummaryComponent: CspBudgetSummary,
      ExpenseCategoryComponent: CspCategoryMonth,
      ExpenseGroupComponent: CspGroupMonth,
      IncomeCategoryComponent: CspCategoryMonth,
      IncomeGroupComponent: CspGroupMonth,
      BudgetTotalsComponent: CspHeaderMonth,
      IncomeHeaderComponent: CspHeaderMonth,
    }),
    [],
  );

  if (!initialized || categoryGroups.length === 0) {
    return null;
  }

  const BudgetProvider =
    budgetType === 'tracking' ? TrackingBudgetProvider : EnvelopeBudgetProvider;

  return (
    <CspComponentsProvider value={cspComponents}>
      <CategoriesOverrideProvider value={categoryGroups}>
        <SheetNameProvider name={monthUtils.sheetForMonth(startMonth)}>
          <View
            style={{
              ...styles.page,
              paddingLeft: 8,
              paddingRight: 8,
              overflow: 'hidden',
            }}
          >
            <BudgetProvider
              summaryCollapsed={summaryCollapsed ?? false}
              onBudgetAction={noopBudgetAction}
              onToggleSummaryCollapse={onToggleCollapse}
            >
              <View style={{ flex: 1 }}>
                <AutoSizingBudgetTable
                  type={budgetType}
                  prewarmStartMonth={startMonth}
                  startMonth={startMonth}
                  monthBounds={bounds}
                  maxMonths={maxMonths}
                  onMonthSelect={onMonthSelect}
                  onDeleteCategory={id => deleteCategory.mutate({ id })}
                  onDeleteGroup={id => deleteCategoryGroup.mutate({ id })}
                  onSaveCategory={category => saveCategory.mutate({ category })}
                  onSaveGroup={group => saveCategoryGroup.mutate({ group })}
                  onBudgetAction={noopBudgetAction}
                  onShowActivity={onShowActivity}
                  onReorderCategory={reorderCategory.mutate}
                  onReorderGroup={noop}
                  onApplyBudgetTemplatesInGroup={noop}
                  onSortCategories={noop}
                />
              </View>
            </BudgetProvider>
          </View>
        </SheetNameProvider>
      </CategoriesOverrideProvider>
    </CspComponentsProvider>
  );
}
