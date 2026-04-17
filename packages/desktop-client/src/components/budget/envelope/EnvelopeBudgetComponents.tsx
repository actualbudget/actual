import React, { memo, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
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
import * as monthUtils from '@actual-app/core/shared/months';
import { css } from '@emotion/css';

import type { CategoryGroupMonthProps, CategoryMonthProps } from '..';
import { BalanceWithCarryover } from '#components/budget/BalanceWithCarryover';
import { makeAmountGrey } from '#components/budget/util';
import { NotesButton } from '#components/NotesButton';
import { CellValue, CellValueText } from '#components/spreadsheet/CellValue';
import { Field, Row, SheetCell } from '#components/table';
import type { SheetCellProps } from '#components/table';
import { useCategoryScheduleGoalTemplateIndicator } from '#hooks/useCategoryScheduleGoalTemplateIndicator';
import { useContextMenu } from '#hooks/useContextMenu';
import { useFormat } from '#hooks/useFormat';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { useSheetName } from '#hooks/useSheetName';
import { useSheetValue } from '#hooks/useSheetValue';
import { useUndo } from '#hooks/useUndo';
import type { Binding, SheetFields } from '#spreadsheet';
import { envelopeBudget } from '#spreadsheet/bindings';

import { BalanceMovementMenu } from './BalanceMovementMenu';
import { BudgetMenu } from './BudgetMenu';
import { useEnvelopeBudget } from './EnvelopeBudgetContext';
import { IncomeMenu } from './IncomeMenu';
import { ScheduledTransactionsPopover } from './ScheduledTransactionsPopover';

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

export const BudgetTotalsMonth = memo(function BudgetTotalsMonth() {
  const [forecastMode = false] = useMetadataPref('budget.forecastMode');

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
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Budgeted</Trans>
        </Text>
        <EnvelopeCellValue
          binding={envelopeBudget.totalBudgeted}
          type="financial"
        >
          {props => (
            <CellValueText {...props} value={-props.value} style={cellStyle} />
          )}
        </EnvelopeCellValue>
      </View>
      {forecastMode && (
        <View style={headerLabelStyle}>
          <Text style={{ color: theme.tableHeaderText }}>
            <Trans>Planned</Trans>
          </Text>
          <EnvelopeCellValue
            binding={envelopeBudget.totalAllPlanned}
            type="financial"
          >
            {props => <CellValueText {...props} style={cellStyle} />}
          </EnvelopeCellValue>
        </View>
      )}
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Spent</Trans>
        </Text>
        <EnvelopeCellValue binding={envelopeBudget.totalSpent} type="financial">
          {props => <CellValueText {...props} style={cellStyle} />}
        </EnvelopeCellValue>
      </View>
      <View style={headerLabelStyle}>
        <Text style={{ color: theme.tableHeaderText }}>
          <Trans>Balance</Trans>
        </Text>
        <EnvelopeCellValue
          binding={envelopeBudget.totalBalance}
          type="financial"
        >
          {props => <CellValueText {...props} style={cellStyle} />}
        </EnvelopeCellValue>
      </View>
    </View>
  );
});

export function IncomeHeaderMonth() {
  const [forecastMode = false] = useMetadataPref('budget.forecastMode');

  return (
    <Row
      style={{
        color: theme.tableHeaderText,
        alignItems: 'center',
        paddingRight: 10,
        backgroundColor: theme.budgetCurrentMonth,
      }}
    >
      {forecastMode && (
        <View style={{ flex: 1, textAlign: 'right' }}>
          <Trans>Planned</Trans>
        </View>
      )}
      <View style={{ flex: 1, textAlign: 'right' }}>
        <Trans>Received</Trans>
      </View>
    </Row>
  );
}

export const ExpenseGroupMonth = memo(function ExpenseGroupMonth({
  month,
  group,
}: CategoryGroupMonthProps) {
  const { id } = group;
  const [forecastMode = false] = useMetadataPref('budget.forecastMode');

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
      {forecastMode && (
        <EnvelopeSheetCell
          name="planned"
          width="flex"
          textAlign="right"
          style={{ fontWeight: 600, ...styles.tnum }}
          valueProps={{
            binding: envelopeBudget.groupPlanned(id),
            type: 'financial',
          }}
        />
      )}
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
  const [forecastMode = false] = useMetadataPref('budget.forecastMode');
  const [editingPlanned, setEditingPlanned] = useState(false);
  const [scheduledPopoverOpen, setScheduledPopoverOpen] = useState(false);

  const { forecastTransactionsByCategoryAndMonth } = useEnvelopeBudget();
  const scheduledTransactions =
    forecastTransactionsByCategoryAndMonth.get(`${category.id}-${month}`) ?? [];
  const scheduledAmount = scheduledTransactions.reduce(
    (sum, tx) => sum + (tx.amount ?? 0),
    0,
  );

  const spentTriggerRef = useRef(null);
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
          <>
            <View
              style={{
                paddingLeft: 3,
                alignItems: 'center',
                justifyContent: 'center',
                borderTopWidth: 1,
                borderBottomWidth: 1,
                borderColor: theme.tableBorder,
              }}
            >
              <NotesButton
                id={`${category.id}-${month}`}
                defaultColor={theme.pageTextLight}
              />
            </View>
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
          </>
        )}
        <EnvelopeSheetCell
          name="budget"
          exposed={editing}
          focused={editing}
          width="flex"
          onExpose={() => {
            setEditingPlanned(false); // Close planned cell if open
            onEdit(category.id, month);
          }}
          style={{ ...(editing && { zIndex: 100 }), ...styles.tnum }}
          textAlign="right"
          valueStyle={{
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + theme.pageTextSubdued, //remove mobile color variable
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          valueProps={{
            binding: envelopeBudget.catBudgeted(category.id),
            type: 'financial',
            getValueStyle: makeAmountGrey,
            formatExpr: format.forEdit,
            unformatExpr: format.fromEdit,
          }}
          inputProps={{
            onBlur: () => {
              onEdit(null);
            },
            style: {
              backgroundColor: theme.budgetCurrentMonth,
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
      {forecastMode && (
        <EnvelopeSheetCell
          name="planned"
          exposed={editingPlanned}
          focused={editingPlanned}
          width="flex"
          onExpose={() => {
            onEdit(null); // Close budgeted cell if open
            setEditingPlanned(true);
          }}
          textAlign="right"
          style={{ ...(editingPlanned && { zIndex: 100 }), ...styles.tnum }}
          valueStyle={{
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + theme.pageTextSubdued,
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          valueProps={{
            binding: envelopeBudget.catPlanned(category.id),
            type: 'financial',
            getValueStyle: makeAmountGrey,
            formatExpr: format.forEdit,
            unformatExpr: format.fromEdit,
          }}
          inputProps={{
            onBlur: () => {
              setEditingPlanned(false);
            },
            style: {
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          onSave={(parsedIntegerAmount: number | null) => {
            onBudgetAction(month, 'planned-amount', {
              category: category.id,
              amount: Math.min(0, parsedIntegerAmount ?? 0),
            });
          }}
        />
      )}
      <Field name="spent" width="flex" style={{ textAlign: 'right' }}>
        <View
          ref={spentTriggerRef}
          data-testid="category-month-spent"
          onClick={() => {
            setScheduledPopoverOpen(true);
          }}
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
          >
            {props => {
              const displayValue =
                forecastMode && scheduledAmount !== 0
                  ? props.value + scheduledAmount
                  : props.value;
              return (
                <CellValueText
                  {...props}
                  value={displayValue}
                  className={css({
                    cursor: 'pointer',
                    ':hover': { textDecoration: 'underline' },
                    ...makeAmountGrey(displayValue),
                    ...(forecastMode && scheduledTransactions.length > 0
                      ? { color: theme.upcomingText }
                      : {}),
                  })}
                />
              );
            }}
          </EnvelopeCellValue>
        </View>
        {scheduledPopoverOpen && (
          <ScheduledTransactionsPopover
            triggerRef={spentTriggerRef}
            isOpen={scheduledPopoverOpen}
            onClose={() => setScheduledPopoverOpen(false)}
            upcomingTransactions={scheduledTransactions}
            categoryId={category.id}
            month={month}
            onViewTransactions={() => {
              setScheduledPopoverOpen(false);
              const scheduleIds = scheduledTransactions
                .map(tx => tx.schedule)
                .filter((s): s is string => Boolean(s));
              onShowActivity(category.id, month, scheduleIds);
            }}
          />
        )}
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
            planned={envelopeBudget.catPlanned(category.id)}
            forecastMode={forecastMode}
            balanceOffset={forecastMode ? scheduledAmount : 0}
            tooltipDisabled={balanceMenuOpen}
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

type IncomeGroupMonthProps = {
  month: string;
};
export function IncomeGroupMonth({ month }: IncomeGroupMonthProps) {
  const [forecastMode = false] = useMetadataPref('budget.forecastMode');

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {forecastMode && (
        <EnvelopeSheetCell
          name="planned"
          width="flex"
          textAlign="right"
          style={{
            fontWeight: 600,
            ...styles.tnum,
          }}
          valueProps={{
            binding: envelopeBudget.totalIncomePlanned,
            type: 'financial',
          }}
        />
      )}
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

export function IncomeCategoryMonth({
  category,
  isLast,
  month,
  editing,
  onEdit,
  onShowActivity,
  onBudgetAction,
}: CategoryMonthProps) {
  const format = useFormat();
  const [forecastMode = false] = useMetadataPref('budget.forecastMode');
  const incomeMenuTriggerRef = useRef(null);
  const {
    setMenuOpen: setIncomeMenuOpen,
    menuOpen: incomeMenuOpen,
    handleContextMenu: handleIncomeContextMenu,
    resetPosition: resetIncomePosition,
    position: incomePosition,
  } = useContextMenu();

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {forecastMode && (
        <EnvelopeSheetCell
          name="planned"
          exposed={editing}
          focused={editing}
          width="flex"
          onExpose={() => onEdit(category.id, month)}
          textAlign="right"
          style={{
            ...(editing && { zIndex: 100 }),
            ...styles.tnum,
            ...(isLast && { borderBottomWidth: 0 }),
            backgroundColor: monthUtils.isCurrentMonth(month)
              ? theme.budgetCurrentMonth
              : theme.budgetOtherMonth,
          }}
          valueStyle={{
            cursor: 'default',
            margin: 1,
            padding: '0 4px',
            borderRadius: 4,
            ':hover': {
              boxShadow: 'inset 0 0 0 1px ' + theme.pageTextSubdued,
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          valueProps={{
            binding: envelopeBudget.catPlanned(category.id),
            type: 'financial',
            getValueStyle: makeAmountGrey,
            formatExpr: format.forEdit,
            unformatExpr: format.fromEdit,
          }}
          inputProps={{
            onBlur: () => {
              onEdit(null);
            },
            style: {
              backgroundColor: theme.budgetCurrentMonth,
            },
          }}
          onSave={(parsedIntegerAmount: number | null) => {
            onBudgetAction(month, 'planned-amount', {
              category: category.id,
              amount: Math.max(0, parsedIntegerAmount ?? 0),
            });
          }}
        />
      )}
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
              planned={envelopeBudget.catPlanned(category.id)}
              forecastMode={forecastMode}
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
