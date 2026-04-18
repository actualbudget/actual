import React, {
  memo,
  useRef,
  type ComponentProps,
  type CSSProperties,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheveronDown } from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
} from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import * as monthUtils from 'loot-core/shared/months';

import { type CategoryGroupMonthProps, type CategoryMonthProps } from '..';

import { BalanceMovementMenu } from './BalanceMovementMenu';
import { BudgetMenu } from './BudgetMenu';
import { IncomeMenu } from './IncomeMenu';

import { BalanceWithCarryover } from '@desktop-client/components/budget/BalanceWithCarryover';
import { makeAmountGrey } from '@desktop-client/components/budget/util';
import {
  CellValue,
  CellValueText,
} from '@desktop-client/components/spreadsheet/CellValue';
import {
  Field,
  Row,
  ROW_HEIGHT,
  SheetCell,
  type SheetCellProps,
} from '@desktop-client/components/table';
import { useCategoryScheduleGoalTemplateIndicator } from '@desktop-client/hooks/useCategoryScheduleGoalTemplateIndicator';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useOnBudgetCurrencies } from '@desktop-client/hooks/useOnBudgetCurrencies';
import { useSheetName } from '@desktop-client/hooks/useSheetName';
import {
  useDynamicSheetValue,
  useSheetValue,
} from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useUndo } from '@desktop-client/hooks/useUndo';
import { type Binding, type SheetFields } from '@desktop-client/spreadsheet';
import { envelopeBudget } from '@desktop-client/spreadsheet/bindings';

export function useEnvelopeSheetName<
  FieldName extends SheetFields<'envelope-budget'>,
>(binding: Binding<'envelope-budget', FieldName>) {
  return useSheetName(binding);
}

export function useEnvelopeSheetValue<
  FieldName extends SheetFields<'envelope-budget'>,
>(binding: Binding<'envelope-budget', FieldName>) {
  return useSheetValue(binding);
}

export const EnvelopeCellValue = <
  FieldName extends SheetFields<'envelope-budget'>,
>(
  props: ComponentProps<typeof CellValue<'envelope-budget', FieldName>>,
) => {
  return <CellValue {...props} />;
};

const EnvelopeSheetCell = <FieldName extends SheetFields<'envelope-budget'>>(
  props: SheetCellProps<'envelope-budget', FieldName>,
) => {
  return <SheetCell {...props} />;
};

const headerLabelStyle: CSSProperties = {
  flex: 1,
  padding: '0 5px',
  textAlign: 'right',
};

const cellStyle: CSSProperties = {
  color: theme.tableHeaderText,
  fontWeight: 600,
};

type BudgetTotalsCurrencyRowProps = {
  currencyCode: string;
};

function BudgetTotalsCurrencyRow({
  currencyCode,
}: BudgetTotalsCurrencyRowProps) {
  const format = useFormat();

  const budgetedValue = useDynamicSheetValue(
    envelopeBudget.totalBudgetedByCurrency(currencyCode),
    0,
  );
  const spentValue = useDynamicSheetValue(
    envelopeBudget.totalSpentByCurrency(currencyCode),
    0,
  );
  const balanceValue = useDynamicSheetValue(
    envelopeBudget.totalBalanceByCurrency(currencyCode),
    0,
  );

  // Negate budgeted value for display, but avoid -0
  const displayBudgeted =
    typeof budgetedValue === 'number' && budgetedValue !== 0
      ? -budgetedValue
      : 0;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={headerLabelStyle}>
        <Text style={cellStyle}>
          {format(displayBudgeted, 'financial', currencyCode)}
        </Text>
      </View>
      <View style={headerLabelStyle}>
        <Text style={cellStyle}>
          {format(
            typeof spentValue === 'number' ? spentValue : 0,
            'financial',
            currencyCode,
          )}
        </Text>
      </View>
      <View style={headerLabelStyle}>
        <Text style={cellStyle}>
          {format(
            typeof balanceValue === 'number' ? balanceValue : 0,
            'financial',
            currencyCode,
          )}
        </Text>
      </View>
    </View>
  );
}

export const BudgetTotalsMonth = memo(function BudgetTotalsMonth() {
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const showMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'column',
        marginRight: styles.monthRightPadding,
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {/* Header row with labels */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        <View style={headerLabelStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Budgeted</Trans>
          </Text>
        </View>
        <View style={headerLabelStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Spent</Trans>
          </Text>
        </View>
        <View style={headerLabelStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Balance</Trans>
          </Text>
        </View>
      </View>

      {/* Show per-currency totals when multi-currency is enabled */}
      {showMultiCurrency ? (
        currencies.map(currencyCode => (
          <BudgetTotalsCurrencyRow
            key={currencyCode}
            currencyCode={currencyCode}
          />
        ))
      ) : (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={headerLabelStyle}>
            <EnvelopeCellValue
              binding={envelopeBudget.totalBudgeted}
              type="financial"
            >
              {props => (
                <CellValueText
                  {...props}
                  value={-props.value}
                  style={cellStyle}
                />
              )}
            </EnvelopeCellValue>
          </View>
          <View style={headerLabelStyle}>
            <EnvelopeCellValue
              binding={envelopeBudget.totalSpent}
              type="financial"
            >
              {props => <CellValueText {...props} style={cellStyle} />}
            </EnvelopeCellValue>
          </View>
          <View style={headerLabelStyle}>
            <EnvelopeCellValue
              binding={envelopeBudget.totalBalance}
              type="financial"
            >
              {props => <CellValueText {...props} style={cellStyle} />}
            </EnvelopeCellValue>
          </View>
        </View>
      )}
    </View>
  );
});

export function IncomeHeaderMonth() {
  return (
    <Row
      style={{
        color: theme.tableHeaderText,
        alignItems: 'center',
        paddingRight: 10,
      }}
    >
      <View style={{ flex: 1, textAlign: 'right' }}>
        <Trans>Received</Trans>
      </View>
    </Row>
  );
}

type ExpenseGroupCurrencyRowProps = {
  groupId: string;
  currencyCode: string;
  month: string;
};

function ExpenseGroupCurrencyRow({
  groupId,
  currencyCode,
  month,
}: ExpenseGroupCurrencyRowProps) {
  const format = useFormat();

  const budgetedValue = useDynamicSheetValue(
    envelopeBudget.groupBudgetedByCurrency(groupId, currencyCode),
    0,
  );
  const spentValue = useDynamicSheetValue(
    envelopeBudget.groupSumAmountByCurrency(groupId, currencyCode),
    0,
  );
  const balanceValue = useDynamicSheetValue(
    envelopeBudget.groupBalanceByCurrency(groupId, currencyCode),
    0,
  );

  const bgStyle = {
    backgroundColor: monthUtils.isCurrentMonth(month)
      ? theme.budgetHeaderCurrentMonth
      : theme.budgetHeaderOtherMonth,
  };

  return (
    <View style={{ flex: 1, flexDirection: 'row', ...bgStyle }}>
      <Field
        name="budgeted"
        width="flex"
        style={{
          fontWeight: 600,
          ...styles.tnum,
          textAlign: 'right',
          ...bgStyle,
        }}
      >
        <Text>
          {format(
            typeof budgetedValue === 'number' ? budgetedValue : 0,
            'financial',
            currencyCode,
          )}
        </Text>
      </Field>
      <Field
        name="spent"
        width="flex"
        style={{
          fontWeight: 600,
          ...styles.tnum,
          textAlign: 'right',
          ...bgStyle,
        }}
      >
        <Text>
          {format(
            typeof spentValue === 'number' ? spentValue : 0,
            'financial',
            currencyCode,
          )}
        </Text>
      </Field>
      <Field
        name="balance"
        width="flex"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
          textAlign: 'right',
          ...bgStyle,
        }}
      >
        <Text>
          {format(
            typeof balanceValue === 'number' ? balanceValue : 0,
            'financial',
            currencyCode,
          )}
        </Text>
      </Field>
    </View>
  );
}

export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({
  month,
  group,
}: CategoryGroupMonthProps) {
  const { id } = group;
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const showMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

  // Check which currencies this group has categories for
  const defaultCurrency = currencies[0];
  const groupCurrencies = showMultiCurrency
    ? currencies.filter(currency =>
        group.categories?.some(cat =>
          currency === defaultCurrency
            ? !cat.currency || cat.currency === currency
            : cat.currency === currency,
        ),
      )
    : [];

  // Show per-currency rows if:
  // 1. Multi-currency is enabled AND
  // 2. Either the group has multiple currencies OR the group only has non-default currency categories
  const hasNonDefaultCurrency =
    groupCurrencies.length > 0 && !groupCurrencies.includes(defaultCurrency);
  const hasMultipleCurrencies = groupCurrencies.length > 1;
  const showPerCurrencyRows = hasMultipleCurrencies || hasNonDefaultCurrency;

  if (showMultiCurrency && showPerCurrencyRows) {
    return (
      <View style={{ flex: 1 }}>
        {groupCurrencies.map(currencyCode => (
          <ExpenseGroupCurrencyRow
            key={currencyCode}
            groupId={id}
            currencyCode={currencyCode}
            month={month}
          />
        ))}
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <EnvelopeSheetCell
        name="budgeted"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: envelopeBudget.groupBudgeted(id),
          type: 'financial',
        }}
      />
      <EnvelopeSheetCell
        name="spent"
        width="flex"
        textAlign="right"
        style={{ fontWeight: 600, ...styles.tnum }}
        valueProps={{
          binding: envelopeBudget.groupSumAmount(id),
          type: 'financial',
        }}
      />
      <EnvelopeSheetCell
        name="balance"
        width="flex"
        textAlign="right"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
        }}
        valueProps={{
          binding: envelopeBudget.groupBalance(id),
          type: 'financial',
        }}
      />
    </View>
  );
});

export const ExpenseCategoryMonth = memo(function ExpenseCategoryMonth({
  month,
  category,
  editing,
  onEdit,
  onBudgetAction,
  onShowActivity,
}: CategoryMonthProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const budgetMenuTriggerRef = useRef(null);
  const balanceMenuTriggerRef = useRef(null);
  const {
    setMenuOpen: setBudgetMenuOpen,
    menuOpen: budgetMenuOpen,
    handleContextMenu: handleBudgetContextMenu,
    resetPosition: resetBudgetPosition,
    position: budgetPosition,
  } = useContextMenu();
  const {
    setMenuOpen: setBalanceMenuOpen,
    menuOpen: balanceMenuOpen,
    handleContextMenu: handleBalanceContextMenu,
    resetPosition: resetBalancePosition,
    position: balancePosition,
  } = useContextMenu();

  const onMenuAction = (...args: Parameters<typeof onBudgetAction>) => {
    onBudgetAction(...args);
    setBudgetMenuOpen(false);
  };

  const { showUndoNotification } = useUndo();

  const navigate = useNavigate();

  const { schedule, scheduleStatus, isScheduleRecurring, description } =
    useCategoryScheduleGoalTemplateIndicator({
      category,
      month,
    });

  const showScheduleIndicator = schedule && scheduleStatus;

  return (
    <View
      style={{
        flex: 1,
        flexDirection: 'row',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible, & .force-visible .hover-visible': {
          opacity: 1,
        },
        '& .hover-expand': {
          maxWidth: 0,
          overflow: 'hidden',
          transition: 'max-width 0s .25s',
        },
        '&:hover .hover-expand, & .hover-expand.force-visible': {
          maxWidth: '300px',
          overflow: 'visible',
          transition: 'max-width 0s linear 0s',
        },
      }}
    >
      <View
        ref={budgetMenuTriggerRef}
        style={{
          flex: 1,
          flexDirection: 'row',
        }}
        onContextMenu={e => {
          if (editing) return;
          handleBudgetContextMenu(e);
        }}
      >
        {!editing && (
          <View
            className={`hover-expand ${budgetMenuOpen ? 'force-visible' : ''}`}
            style={{
              flexDirection: 'row',
              flexShrink: 1,
              paddingLeft: 3,
              alignItems: 'center',
              justifyContent: 'center',
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: theme.tableBorder,
            }}
          >
            <Button
              variant="bare"
              onPress={() => {
                resetBudgetPosition(2, -4);
                setBudgetMenuOpen(true);
              }}
              style={{
                padding: 3,
              }}
            >
              <SvgCheveronDown
                width={14}
                height={14}
                className="hover-visible"
              />
            </Button>

            <Popover
              triggerRef={budgetMenuTriggerRef}
              placement="bottom left"
              isOpen={budgetMenuOpen}
              onOpenChange={() => setBudgetMenuOpen(false)}
              style={{ width: 200 }}
              isNonModal
              {...budgetPosition}
            >
              <BudgetMenu
                onCopyLastMonthAverage={() => {
                  onMenuAction(month, 'copy-single-last', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget set to last month's budget.`),
                  });
                }}
                onSetMonthsAverage={numberOfMonths => {
                  if (
                    numberOfMonths !== 3 &&
                    numberOfMonths !== 6 &&
                    numberOfMonths !== 12
                  ) {
                    return;
                  }

                  onMenuAction(month, `set-single-${numberOfMonths}-avg`, {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(
                      'Budget set to {{numberOfMonths}}-month average.',
                      { numberOfMonths },
                    ),
                  });
                }}
                onApplyBudgetTemplate={() => {
                  onMenuAction(month, 'apply-single-category-template', {
                    category: category.id,
                  });
                  showUndoNotification({
                    message: t(`Budget template applied.`),
                  });
                }}
              />
            </Popover>
          </View>
        )}
        <EnvelopeSheetCell
          name="budget"
          exposed={editing}
          focused={editing}
          width="flex"
          onExpose={() => onEdit(category.id, month)}
          style={{ ...(editing && { zIndex: 100 }), ...styles.tnum }}
          textAlign="right"
          valueStyle={{
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + theme.mobileAccountShadow,
              backgroundColor: theme.tableBackground,
            },
          }}
          valueProps={{
            binding: envelopeBudget.catBudgeted(category.id),
            type: 'financial',
            getValueStyle: makeAmountGrey,
            formatExpr: format.forEdit,
            unformatExpr: format.fromEdit,
            currencyCode: category.currency,
          }}
          inputProps={{
            onBlur: () => {
              onEdit(null);
            },
            style: {
              backgroundColor: theme.tableBackground,
            },
          }}
          onSave={(parsedIntegerAmount: number | null) => {
            onBudgetAction(month, 'budget-amount', {
              category: category.id,
              amount: parsedIntegerAmount ?? 0,
            });
          }}
        />
      </View>
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
        <View
          data-testid="category-month-spent"
          onClick={() => onShowActivity(category.id, month)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: showScheduleIndicator
              ? 'space-between'
              : 'flex-end',
            gap: 2,
          }}
        >
          {showScheduleIndicator && (
            <View title={description}>
              <Button
                variant="bare"
                style={{
                  color:
                    scheduleStatus === 'missed'
                      ? theme.budgetNumberNegative
                      : scheduleStatus === 'due'
                        ? theme.templateNumberUnderFunded
                        : theme.upcomingText,
                }}
                onPress={() =>
                  schedule._account
                    ? navigate(`/accounts/${schedule._account}`)
                    : navigate('/accounts')
                }
              >
                {isScheduleRecurring ? (
                  <SvgArrowsSynchronize style={{ width: 12, height: 12 }} />
                ) : (
                  <SvgCalendar3 style={{ width: 12, height: 12 }} />
                )}
              </Button>
            </View>
          )}
          <EnvelopeCellValue
            binding={envelopeBudget.catSumAmount(category.id)}
            type="financial"
            currencyCode={category.currency}
          >
            {props => (
              <CellValueText
                {...props}
                className={css({
                  cursor: 'pointer',
                  ':hover': { textDecoration: 'underline' },
                  ...makeAmountGrey(props.value),
                })}
              />
            )}
          </EnvelopeCellValue>
        </View>
      </Field>
      <Field
        ref={balanceMenuTriggerRef}
        name="balance"
        width="flex"
        style={{ paddingRight: styles.monthRightPadding, textAlign: 'right' }}
      >
        <Button
          variant="bare"
          onPress={() => {
            resetBalancePosition(-6, -4);
            setBalanceMenuOpen(true);
          }}
          onContextMenu={e => {
            handleBalanceContextMenu(e);
            // We need to calculate differently from the hook due to being aligned to the right
            const rect = e.currentTarget.getBoundingClientRect();
            resetBalancePosition(
              e.clientX - rect.right + 200 - 8,
              e.clientY - rect.bottom - 8,
            );
          }}
          style={{
            justifyContent: 'flex-end',
            background: 'transparent',
            width: '100%',
            padding: 0,
          }}
        >
          <BalanceWithCarryover
            carryover={envelopeBudget.catCarryover(category.id)}
            balance={envelopeBudget.catBalance(category.id)}
            goal={envelopeBudget.catGoal(category.id)}
            budgeted={envelopeBudget.catBudgeted(category.id)}
            longGoal={envelopeBudget.catLongGoal(category.id)}
            tooltipDisabled={balanceMenuOpen}
            currencyCode={category.currency}
          />
        </Button>

        <Popover
          triggerRef={balanceMenuTriggerRef}
          placement="bottom end"
          isOpen={balanceMenuOpen}
          onOpenChange={() => setBalanceMenuOpen(false)}
          style={{ margin: 1 }}
          isNonModal
          {...balancePosition}
        >
          <BalanceMovementMenu
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
            onClose={() => setBalanceMenuOpen(false)}
          />
        </Popover>
      </Field>
    </View>
  );
});

type IncomeGroupCurrencyRowProps = {
  currencyCode: string;
  month: string;
};

function IncomeGroupCurrencyRow({
  currencyCode,
  month,
}: IncomeGroupCurrencyRowProps) {
  const format = useFormat();
  const totalIncome = useDynamicSheetValue(
    envelopeBudget.totalIncomeByCurrency(currencyCode),
    0,
  );
  const value = typeof totalIncome === 'number' ? totalIncome : 0;

  return (
    <Field
      name={`received-${currencyCode}`}
      width="flex"
      style={{
        height: ROW_HEIGHT,
        fontWeight: 600,
        paddingRight: styles.monthRightPadding,
        ...styles.tnum,
        textAlign: 'right',
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
      }}
    >
      <Text>{format(value, 'financial', currencyCode)}</Text>
    </Field>
  );
}

type IncomeGroupMonthProps = {
  month: string;
};
export function IncomeGroupMonth({ month }: IncomeGroupMonthProps) {
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const showMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

  if (showMultiCurrency) {
    // Show per-currency income totals
    return (
      <View style={{ flex: 1 }}>
        {currencies.map(currencyCode => (
          <IncomeGroupCurrencyRow
            key={currencyCode}
            currencyCode={currencyCode}
            month={month}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <EnvelopeSheetCell
        name="received"
        width="flex"
        textAlign="right"
        style={{
          fontWeight: 600,
          paddingRight: styles.monthRightPadding,
          ...styles.tnum,
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetHeaderCurrentMonth
            : theme.budgetHeaderOtherMonth,
        }}
        valueProps={{
          binding: envelopeBudget.groupIncomeReceived,
          type: 'financial',
        }}
      />
    </View>
  );
}

type IncomeCategoryCurrencyValueProps = {
  categoryId: string;
  currencyCode: string;
};

function IncomeCategoryCurrencyValue({
  categoryId,
  currencyCode,
}: IncomeCategoryCurrencyValueProps) {
  const categoryIncome = useDynamicSheetValue(
    envelopeBudget.catSumAmountByCurrency(categoryId, currencyCode),
    0,
  );
  const value = typeof categoryIncome === 'number' ? categoryIncome : 0;

  return (
    <CellValueText
      name={`sum-amount-${categoryId}-${currencyCode}`}
      value={value}
      type="financial"
      currencyCode={currencyCode}
      className={css({
        cursor: 'pointer',
        ':hover': { textDecoration: 'underline' },
        ...makeAmountGrey(value),
      })}
    />
  );
}

type IncomeCategoryCurrencyRowProps = {
  categoryId: string;
  currencyCode: string;
  month: string;
  isLast?: boolean;
  isLastCurrency: boolean;
  triggerRef?: React.RefObject<HTMLDivElement | null>;
  onOpenMenu: () => void;
  onContextMenu: (e: React.MouseEvent<HTMLElement>) => void;
};

function IncomeCategoryCurrencyRow({
  categoryId,
  currencyCode,
  month,
  isLast,
  isLastCurrency,
  triggerRef,
  onOpenMenu,
  onContextMenu,
}: IncomeCategoryCurrencyRowProps) {
  const categoryIncome = useDynamicSheetValue(
    envelopeBudget.catSumAmountByCurrency(categoryId, currencyCode),
    0,
  );
  const value = typeof categoryIncome === 'number' ? categoryIncome : 0;

  return (
    <Field
      name={`received-${currencyCode}`}
      width="flex"
      truncate={false}
      ref={triggerRef}
      style={{
        height: ROW_HEIGHT,
        textAlign: 'right',
        ...(isLast && isLastCurrency && { borderBottomWidth: 0 }),
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetCurrentMonth
          : theme.budgetOtherMonth,
      }}
    >
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          position: 'relative',
        }}
      >
        <span
          role="button"
          onClick={onOpenMenu}
          onContextMenu={onContextMenu}
          style={{ paddingRight: styles.monthRightPadding }}
        >
          <CellValueText
            name={`sum-amount-${categoryId}-${currencyCode}`}
            value={value}
            type="financial"
            currencyCode={currencyCode}
            className={css({
              cursor: 'pointer',
              ':hover': { textDecoration: 'underline' },
              ...makeAmountGrey(value),
            })}
          />
        </span>
      </View>
    </Field>
  );
}

export function IncomeCategoryMonth({
  category,
  isLast,
  month,
  onShowActivity,
  onBudgetAction,
}: CategoryMonthProps) {
  const currencies = useOnBudgetCurrencies();
  const [enableMultiCurrencyOnBudget] = useSyncedPref(
    'enableMultiCurrencyOnBudget',
  );
  const showMultiCurrency =
    enableMultiCurrencyOnBudget === 'true' && currencies.length > 1;

  const incomeMenuTriggerRef = useRef<HTMLDivElement>(null);
  const {
    setMenuOpen: setIncomeMenuOpen,
    menuOpen: incomeMenuOpen,
    handleContextMenu: handleIncomeContextMenu,
    resetPosition: resetIncomePosition,
    position: incomePosition,
  } = useContextMenu();

  if (showMultiCurrency) {
    const handleOpenMenu = () => {
      resetIncomePosition(-6, -4);
      setIncomeMenuOpen(true);
    };
    const handleContextMenuEvent = (e: React.MouseEvent<HTMLElement>) => {
      handleIncomeContextMenu(e);
      const rect = e.currentTarget.getBoundingClientRect();
      resetIncomePosition(
        e.clientX - rect.right + 200 - 8,
        e.clientY - rect.bottom - 8,
      );
    };

    // Show per-currency income amounts for this category (only non-zero amounts)
    return (
      <View style={{ flex: 1 }}>
        {currencies.map((currencyCode, index) => (
          <IncomeCategoryCurrencyRow
            key={currencyCode}
            categoryId={category.id}
            currencyCode={currencyCode}
            month={month}
            isLast={isLast}
            isLastCurrency={index === currencies.length - 1}
            triggerRef={index === 0 ? incomeMenuTriggerRef : undefined}
            onOpenMenu={handleOpenMenu}
            onContextMenu={handleContextMenuEvent}
          />
        ))}
        <Popover
          triggerRef={incomeMenuTriggerRef}
          placement="bottom end"
          isOpen={incomeMenuOpen}
          onOpenChange={() => setIncomeMenuOpen(false)}
          style={{ margin: 1 }}
          isNonModal
          {...incomePosition}
        >
          <IncomeMenu
            categoryId={category.id}
            month={month}
            onBudgetAction={onBudgetAction}
            onShowActivity={onShowActivity}
            onClose={() => setIncomeMenuOpen(false)}
          />
        </Popover>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Field
        name="received"
        width="flex"
        truncate={false}
        ref={incomeMenuTriggerRef}
        style={{
          textAlign: 'right',
          ...(isLast && { borderBottomWidth: 0 }),
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetCurrentMonth
            : theme.budgetOtherMonth,
        }}
      >
        <View
          name="received"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            position: 'relative',
          }}
        >
          <Button
            variant="bare"
            onPress={() => {
              resetIncomePosition(-6, -4);
              setIncomeMenuOpen(true);
            }}
            onContextMenu={e => {
              handleIncomeContextMenu(e);
              // We need to calculate differently from the hook due to being aligned to the right
              const rect = e.currentTarget.getBoundingClientRect();
              resetIncomePosition(
                e.clientX - rect.right + 200 - 8,
                e.clientY - rect.bottom - 8,
              );
            }}
            style={{
              background: 'transparent',
              padding: 0,
              paddingRight: styles.monthRightPadding,
            }}
          >
            <BalanceWithCarryover
              carryover={envelopeBudget.catCarryover(category.id)}
              balance={envelopeBudget.catSumAmount(category.id)}
              goal={envelopeBudget.catGoal(category.id)}
              budgeted={envelopeBudget.catBudgeted(category.id)}
              longGoal={envelopeBudget.catLongGoal(category.id)}
            />
          </Button>
          <Popover
            triggerRef={incomeMenuTriggerRef}
            placement="bottom end"
            isOpen={incomeMenuOpen}
            onOpenChange={() => setIncomeMenuOpen(false)}
            style={{ margin: 1 }}
            isNonModal
            {...incomePosition}
          >
            <IncomeMenu
              categoryId={category.id}
              month={month}
              onBudgetAction={onBudgetAction}
              onShowActivity={onShowActivity}
              onClose={() => setIncomeMenuOpen(false)}
            />
          </Popover>
        </View>
      </Field>
    </View>
  );
}

export { BudgetSummary } from './budgetsummary/BudgetSummary';
