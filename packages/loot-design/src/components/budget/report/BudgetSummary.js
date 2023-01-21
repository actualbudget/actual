import React, { useState } from 'react';

import { css } from 'glamor';

import { reportBudget } from 'loot-core/src/client/queries';
import * as monthUtils from 'loot-core/src/shared/months';

import { colors, styles } from '../../../style';
import DotsHorizontalTriple from '../../../svg/v1/DotsHorizontalTriple';
import ArrowButtonDown1 from '../../../svg/v2/ArrowButtonDown1';
import ArrowButtonUp1 from '../../../svg/v2/ArrowButtonUp1';
import {
  View,
  Text,
  Button,
  Tooltip,
  Menu,
  Stack,
  HoverTarget,
  AlignedText
} from '../../common';
import NotesButton from '../../NotesButton';
import CellValue from '../../spreadsheet/CellValue';
import format from '../../spreadsheet/format';
import NamespaceContext from '../../spreadsheet/NamespaceContext';
import useSheetValue from '../../spreadsheet/useSheetValue';
import { MONTH_BOX_SHADOW } from '../constants';
import { makeAmountFullStyle } from '../util';

import { useReport } from './ReportContext';

function PieProgress({ style, progress, color, backgroundColor }) {
  let radius = 4;
  let circum = 2 * Math.PI * radius;
  let dash = progress * circum;
  let gap = circum;

  return (
    <svg viewBox="0 0 20 20" style={style}>
      <circle r="10" cx="10" cy="10" fill={backgroundColor} />
      <circle
        r={radius}
        cx="10"
        cy="10"
        fill="none"
        stroke={color}
        strokeWidth={radius * 2}
        strokeDasharray={`${dash} ${gap}`}
        transform="rotate(-90) translate(-20)"
      />{' '}
    </svg>
  );
}

function fraction(num, denom) {
  if (denom === 0) {
    if (num > 0) {
      return 1;
    }
    return 0;
  }

  return num / denom;
}

function IncomeProgress({ current, target }) {
  let totalIncome = useSheetValue(current) || 0;
  let totalBudgeted = useSheetValue(target) || 0;

  let over = false;

  if (totalIncome < 0) {
    over = true;
    totalIncome = -totalIncome;
  }

  let frac = fraction(totalIncome, totalBudgeted);

  return (
    <PieProgress
      progress={frac}
      color={over ? colors.r7 : colors.g5}
      backgroundColor={over ? colors.r10 : colors.n10}
      style={{ width: 20, height: 20 }}
    />
  );
}

function ExpenseProgress({ current, target }) {
  let totalSpent = useSheetValue(current) || 0;
  let totalBudgeted = useSheetValue(target) || 0;

  // Reverse total spent, and also set a bottom boundary of 0 (in case
  // income goes into an expense category and it's "positive", don't
  // show that in the graph)
  totalSpent = Math.max(-totalSpent, 0);

  let frac;
  let over = false;

  if (totalSpent > totalBudgeted) {
    frac = (totalSpent - totalBudgeted) / totalBudgeted;
    over = true;
  } else {
    frac = fraction(totalSpent, totalBudgeted);
  }

  return (
    <PieProgress
      progress={frac}
      color={over ? colors.r7 : colors.g5}
      backgroundColor={over ? colors.r10 : colors.n10}
      style={{ width: 20, height: 20 }}
    />
  );
}

function BudgetTotal({ title, current, target, ProgressComponent, style }) {
  return (
    <View
      style={[
        {
          lineHeight: 1.5,
          flexDirection: 'row',
          alignItems: 'center',
          fontSize: 14
        },
        style
      ]}
    >
      <ProgressComponent current={current} target={target} />

      <View style={{ marginLeft: 10 }}>
        <View>
          <Text style={{ color: colors.n4 }}>{title}</Text>
        </View>

        <Text>
          <CellValue binding={current} type="financial" />
          <Text style={{ color: colors.n6, fontStyle: 'italic' }}>
            {' of '}
            <CellValue
              binding={target}
              type="financial"
              style={styles.notFixed}
            />
          </Text>
        </Text>
      </View>
    </View>
  );
}

function IncomeTotal({ projected, style }) {
  return (
    <BudgetTotal
      title="Income"
      current={reportBudget.totalIncome}
      target={reportBudget.totalBudgetedIncome}
      ProgressComponent={IncomeProgress}
      style={style}
    />
  );
}

function ExpenseTotal({ style }) {
  return (
    <BudgetTotal
      title="Expenses"
      current={reportBudget.totalSpent}
      target={reportBudget.totalBudgetedExpense}
      ProgressComponent={ExpenseProgress}
      style={style}
    />
  );
}

function Saved({ projected, style }) {
  let budgetedSaved = useSheetValue(reportBudget.totalBudgetedSaved) || 0;
  let totalSaved = useSheetValue(reportBudget.totalSaved) || 0;
  let saved = projected ? budgetedSaved : totalSaved;
  let isNegative = saved < 0;

  return (
    <View style={[{ alignItems: 'center', fontSize: 14 }, style]}>
      {projected ? (
        <Text style={{ color: colors.n4 }}>Projected Savings:</Text>
      ) : (
        <View style={{ color: colors.n4 }}>
          {isNegative ? 'Overspent:' : 'Saved:'}
        </View>
      )}

      <HoverTarget
        renderContent={() => {
          if (!projected) {
            let diff = totalSaved - budgetedSaved;
            return (
              <Tooltip
                position="bottom-center"
                style={{ padding: 10, fontSize: 14 }}
              >
                <AlignedText
                  left="Projected Savings:"
                  right={
                    <Text
                      style={[makeAmountFullStyle(budgetedSaved), styles.tnum]}
                    >
                      {format(budgetedSaved, 'financial-with-sign')}
                    </Text>
                  }
                />
                <AlignedText
                  left="Difference:"
                  right={
                    <Text style={[makeAmountFullStyle(diff), styles.tnum]}>
                      {format(diff, 'financial-with-sign')}
                    </Text>
                  }
                />
              </Tooltip>
            );
          }
          return null;
        }}
      >
        <View
          {...css([
            {
              fontSize: 25,
              color: projected ? colors.y3 : isNegative ? colors.r4 : colors.p5
            }
          ])}
        >
          {format(saved, 'financial')}
        </View>
      </HoverTarget>
    </View>
  );
}

export default React.memo(function BudgetSummary({ month }) {
  let {
    currentMonth,
    summaryCollapsed: collapsed,
    onBudgetAction,
    onToggleSummaryCollapse
  } = useReport();

  let [menuOpen, setMenuOpen] = useState(false);
  function onMenuOpen(e) {
    setMenuOpen(true);
  }

  function onMenuClose(bag) {
    setMenuOpen(false);
  }

  let ExpandOrCollapseIcon = collapsed ? ArrowButtonDown1 : ArrowButtonUp1;

  return (
    <View
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
          transition: 'opacity .25s'
        },
        '&:hover .hover-visible': {
          opacity: 1
        }
      }}
    >
      <NamespaceContext.Provider
        value={monthUtils.sheetForMonth(month, 'report')}
      >
        <View
          style={[
            { padding: '0 13px' },
            collapsed ? { margin: '10px 0' } : { marginTop: 16 }
          ]}
        >
          <View
            style={{
              position: 'absolute',
              left: 10,
              top: 0
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
                textDecorationSkip: 'ink'
              },
              currentMonth === month && { textDecoration: 'underline' }
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
              alignItems: 'center'
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
            <View style={{ userSelect: 'none' }}>
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
                      { name: 'copy-last', text: "Copy last month's budget" },
                      { name: 'set-zero', text: 'Set budgets to zero' },
                      {
                        name: 'set-3-avg',
                        text: 'Set budgets to 3 month avg'
                      }
                    ]}
                  />
                </Tooltip>
              )}
            </View>
          </View>
        </View>

        {!collapsed && (
          <Stack
            spacing={2}
            style={{
              alignSelf: 'center',
              backgroundColor: colors.n11,
              borderRadius: 4,
              padding: '10px 15px',
              marginTop: 13
            }}
          >
            <IncomeTotal />
            <ExpenseTotal />
          </Stack>
        )}

        {collapsed ? (
          <View
            style={{
              alignItems: 'center',
              padding: '10px 20px',
              justifyContent: 'space-between',
              backgroundColor: colors.n11,
              borderTop: '1px solid ' + colors.n10
            }}
          >
            <Saved projected={month >= currentMonth} />
          </View>
        ) : (
          <Saved
            projected={month >= currentMonth}
            style={{ marginTop: 13, marginBottom: 20 }}
          />
        )}
      </NamespaceContext.Provider>
    </View>
  );
});
