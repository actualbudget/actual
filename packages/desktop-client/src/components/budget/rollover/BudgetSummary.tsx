import React, { useState } from 'react';

import { css } from 'glamor';

import { rolloverBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import DotsHorizontalTriple from '../../../icons/v1/DotsHorizontalTriple';
import ArrowButtonDown1 from '../../../icons/v2/ArrowButtonDown1';
import ArrowButtonUp1 from '../../../icons/v2/ArrowButtonUp1';
import { colors, styles } from '../../../style';
import {
  View,
  Block,
  Button,
  Tooltip,
  Menu,
  HoverTarget,
  AlignedText,
} from '../../common';
import NotesButton from '../../NotesButton';
import CellValue from '../../spreadsheet/CellValue';
import format from '../../spreadsheet/format';
import NamespaceContext from '../../spreadsheet/NamespaceContext';
import SheetValue from '../../spreadsheet/SheetValue';
import { MONTH_BOX_SHADOW } from '../constants';

import HoldTooltip from './HoldTooltip';
import { useRollover } from './RolloverContext';
import TransferTooltip from './TransferTooltip';

type TotalsListProps = {
  prevMonthName: string;
  collapsed?: boolean;
};
function TotalsList({ prevMonthName, collapsed }: TotalsListProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          lineHeight: 1.5,
          justifyContent: 'center',
        },
        !collapsed && {
          padding: '5px 0',
          marginTop: 17,
          backgroundColor: colors.n11,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: colors.n9,
        },
        collapsed && {
          padding: 7,
        },
        styles.smallText,
      ]}
    >
      <View
        style={{
          textAlign: 'right',
          marginRight: 10,
          minWidth: 50,
        }}
      >
        <HoverTarget
          style={{ flexShrink: 0 }}
          renderContent={() => (
            <Tooltip
              width={200}
              style={{ lineHeight: 1.5, padding: '6px 10px' }}
            >
              <AlignedText
                left="Income:"
                right={
                  <CellValue
                    binding={rolloverBudget.totalIncome}
                    type="financial"
                  />
                }
              />
              <AlignedText
                left="From Last Month:"
                right={
                  <CellValue
                    binding={rolloverBudget.fromLastMonth}
                    type="financial"
                  />
                }
              />
            </Tooltip>
          )}
        >
          <CellValue
            binding={rolloverBudget.incomeAvailable}
            type="financial"
            style={{ fontWeight: 600 }}
          />
        </HoverTarget>

        <CellValue
          binding={rolloverBudget.lastMonthOverspent}
          formatter={value => {
            let v = format(value, 'financial');
            return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
          }}
          style={[{ fontWeight: 600 }, styles.tnum]}
        />

        <CellValue
          binding={rolloverBudget.totalBudgeted}
          formatter={value => {
            let v = format(value, 'financial');
            return value > 0 ? '+' + v : value === 0 ? '-' + v : v;
          }}
          style={[{ fontWeight: 600 }, styles.tnum]}
        />

        <CellValue
          binding={rolloverBudget.forNextMonth}
          formatter={value => {
            let n = parseInt(value) || 0;
            let v = format(Math.abs(n), 'financial');
            return n >= 0 ? '-' + v : '+' + v;
          }}
          style={[{ fontWeight: 600 }, styles.tnum]}
        />
      </View>

      <View>
        <Block>Available Funds</Block>
        <Block>Overspent in {prevMonthName}</Block>
        <Block>Budgeted</Block>
        <Block>For Next Month</Block>
      </View>
    </View>
  );
}

type ToBudgetProps = {
  month: string | number;
  prevMonthName?: string;
  collapsed?: boolean;
  onBudgetAction: (idx: string | number, action: string, arg?: unknown) => void;
};
function ToBudget({
  month,
  prevMonthName,
  collapsed,
  onBudgetAction,
}: ToBudgetProps) {
  let [menuOpen, setMenuOpen] = useState(null);

  return (
    <SheetValue binding={rolloverBudget.toBudget} initialValue={0}>
      {node => {
        const availableValue = parseInt(node.value);
        const num = isNaN(availableValue) ? 0 : availableValue;
        const isNegative = num < 0;

        return (
          <View style={{ alignItems: 'center' }}>
            <Block>{isNegative ? 'Overbudgeted:' : 'To Budget:'}</Block>
            <View>
              <HoverTarget
                disabled={!collapsed || menuOpen}
                renderContent={() => (
                  <Tooltip position="bottom-center">
                    <TotalsList
                      collapsed={true}
                      prevMonthName={prevMonthName}
                    />
                  </Tooltip>
                )}
              >
                <Block
                  onClick={() => setMenuOpen('actions')}
                  data-cellname={node.name}
                  {...css([
                    styles.veryLargeText,
                    {
                      fontWeight: 400,
                      userSelect: 'none',
                      cursor: 'pointer',
                      color: isNegative ? colors.r4 : colors.p5,
                      marginBottom: -1,
                      borderBottom: '1px solid transparent',
                      ':hover': {
                        borderColor: isNegative ? colors.r4 : colors.p5,
                      },
                    },
                  ])}
                >
                  {format(num, 'financial')}
                </Block>
              </HoverTarget>
              {menuOpen === 'actions' && (
                <Tooltip
                  position="bottom-center"
                  width={200}
                  style={{ padding: 0 }}
                  onClose={() => setMenuOpen(null)}
                >
                  <Menu
                    onMenuSelect={type => {
                      if (type === 'reset-buffer') {
                        onBudgetAction(month, 'reset-hold');
                        setMenuOpen(null);
                      } else {
                        setMenuOpen(type);
                      }
                    }}
                    items={[
                      {
                        name: 'transfer',
                        text: 'Move to a category',
                      },
                      {
                        name: 'buffer',
                        text: 'Hold for next month',
                      },
                      {
                        name: 'reset-buffer',
                        text: 'Reset next month’s buffer',
                      },
                    ]}
                  />
                </Tooltip>
              )}
              {menuOpen === 'buffer' && (
                <HoldTooltip
                  onClose={() => setMenuOpen(null)}
                  onSubmit={amount => {
                    onBudgetAction(month, 'hold', { amount });
                  }}
                />
              )}
              {menuOpen === 'transfer' && (
                <TransferTooltip
                  initialAmount={availableValue}
                  onClose={() => setMenuOpen(null)}
                  onSubmit={(amount, category) => {
                    onBudgetAction(month, 'transfer-available', {
                      amount,
                      category,
                    });
                  }}
                />
              )}
            </View>
          </View>
        );
      }}
    </SheetValue>
  );
}

type BudgetSummaryProps = {
  month: string | number;
  isGoalTemplatesEnabled: boolean;
};
export function BudgetSummary({
  month,
  isGoalTemplatesEnabled,
}: BudgetSummaryProps) {
  let {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse,
  } = useRollover();

  let [menuOpen, setMenuOpen] = useState(false);
  function onMenuOpen(e) {
    setMenuOpen(true);
  }

  function onMenuClose() {
    setMenuOpen(false);
  }

  let prevMonthName = monthUtils.format(monthUtils.prevMonth(month), 'MMM');

  let ExpandOrCollapseIcon = collapsed ? ArrowButtonDown1 : ArrowButtonUp1;

  return (
    <View
      data-testid="budget-summary"
      style={{
        backgroundColor: 'white',
        boxShadow: MONTH_BOX_SHADOW,
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
      <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
        <View
          style={[
            { padding: '0 13px' },
            collapsed ? { margin: '10px 0' } : { marginTop: 16 },
          ]}
        >
          <View
            style={{
              position: 'absolute',
              left: 10,
              top: 0,
            }}
          >
            <Button
              className="hover-visible"
              bare
              onClick={onToggleSummaryCollapse}
            >
              <ExpandOrCollapseIcon
                width={13}
                height={13}
                // The margin is to make it the exact same size as the dots button
                style={{ color: colors.n6, margin: 1 }}
              />
            </Button>
          </View>

          <div
            {...css([
              {
                textAlign: 'center',
                marginTop: 3,
                fontSize: 18,
                fontWeight: 500,
                textDecorationSkip: 'ink',
              },
              currentMonth === month && { textDecoration: 'underline' },
            ])}
          >
            {monthUtils.format(month, 'MMMM')}
          </div>

          <View
            style={{
              position: 'absolute',
              right: 10,
              top: 0,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View>
              <NotesButton
                id={`budget-${month}`}
                width={15}
                height={15}
                tooltipPosition="bottom-right"
                defaultColor={colors.n6}
              />
            </View>
            <View style={{ userSelect: 'none', marginLeft: 2 }}>
              <Button bare onClick={onMenuOpen}>
                <DotsHorizontalTriple
                  width={15}
                  height={15}
                  style={{ color: colors.n5 }}
                />
              </Button>
              {menuOpen && (
                <Tooltip
                  position="bottom-right"
                  width={200}
                  style={{ padding: 0 }}
                  onClose={onMenuClose}
                >
                  <Menu
                    onMenuSelect={type => {
                      onMenuClose();
                      onBudgetAction(month, type);
                    }}
                    items={[
                      { name: 'copy-last', text: 'Copy last month’s budget' },
                      { name: 'set-zero', text: 'Set budgets to zero' },
                      {
                        name: 'set-3-avg',
                        text: 'Set budgets to 3 month avg',
                      },
                      isGoalTemplatesEnabled && {
                        name: 'check-templates',
                        text: 'Check templates',
                      },
                      isGoalTemplatesEnabled && {
                        name: 'apply-goal-template',
                        text: 'Apply budget template',
                      },
                      isGoalTemplatesEnabled && {
                        name: 'overwrite-goal-template',
                        text: 'Overwrite with budget template',
                      },
                      isGoalTemplatesEnabled && {
                        name: 'cleanup-goal-template',
                        text: 'End of month cleanup',
                      },
                    ]}
                  />
                </Tooltip>
              )}
            </View>
          </View>
        </View>

        {collapsed ? (
          <View
            style={{
              alignItems: 'center',
              padding: '10px 20px',
              justifyContent: 'space-between',
              backgroundColor: colors.n11,
              borderTop: '1px solid ' + colors.n10,
            }}
          >
            <ToBudget
              collapsed={collapsed}
              prevMonthName={prevMonthName}
              month={month}
              onBudgetAction={onBudgetAction}
            />
          </View>
        ) : (
          <>
            <TotalsList prevMonthName={prevMonthName} />
            <View style={{ margin: '23px 0' }}>
              <ToBudget month={month} onBudgetAction={onBudgetAction} />
            </View>
          </>
        )}
      </NamespaceContext.Provider>
    </View>
  );
}
