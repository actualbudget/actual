import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { View } from '@actual-app/components/view';

import { envelopeBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency } from 'loot-core/shared/util';

import { type CategoryEntity } from '../../../../loot-core/src/types/models';
import { theme } from '../../style';
import { useSheetValue } from '../spreadsheet/useSheetValue';

import { useEnvelopeBudget } from './envelope/EnvelopeBudgetContext';

const ColorDefUnderBudgetRemaining = theme.reportsGreen;
const ColorDefUnderBudgetSpent = theme.reportsGray;
const ColorDefOverBudgetSpent = theme.reportsGray;
const ColorDefOverBudgetOverSpent = theme.reportsRed;
const ColorDefGoalRemaining = theme.reportsLabel;
const ColorDefGoalSaved = theme.reportsBlue;
const ColorDefEmpty = ''; // No color for default

class ColorBar {
  color: string;
  width: number;
  category: string;
  rawValue: string;

  constructor(
    color: string = ColorDefEmpty,
    width: number = 50,
    category: string = '',
    rawValue: string = '',
  ) {
    this.color = color;
    this.width = width;
    this.category = category;
    this.rawValue = rawValue;
  }
}

/** Generate what the color status bar should look like based on our numbers and the category type */
function getColorBars(
  budgeted: number,
  spent: number,
  balance: number,
  goal: number,
  isLongGoal: boolean,
) {
  const leftBar = new ColorBar();
  const rightBar = new ColorBar();

  if (isLongGoal) {
    // We have a long-term #goal set. These take visual precedence over a monthly template goal, even if both exist
    if (balance < 0) {
      // Standard goal with a non-negative balance
      const toGoal = -1 * balance + goal;
      leftBar.width = Math.min(Math.round((goal / toGoal) * 100), 100);
      rightBar.width = 100 - leftBar.width;

      leftBar.color = ColorDefGoalRemaining;
      rightBar.color = ColorDefOverBudgetOverSpent;

      leftBar.rawValue = integerToCurrency(toGoal);
      rightBar.rawValue = integerToCurrency(balance);

      leftBar.category = 'Remaining';
      rightBar.category = 'Overspent';
    } else {
      // Standard goal with a non-negative balance
      leftBar.width = Math.min(Math.round((balance / goal) * 100), 100);
      rightBar.width = 100 - leftBar.width;

      leftBar.color = ColorDefGoalSaved;
      rightBar.color = ColorDefGoalRemaining;

      leftBar.rawValue = integerToCurrency(balance);
      rightBar.rawValue = integerToCurrency(goal - balance);

      leftBar.category = 'Saved';
      rightBar.category = 'Remaining';
    }
  } else if (spent * -1 >= budgeted) {
    // We overspent (or are exactly at budget)
    const overage = -1 * spent - budgeted;
    const total = budgeted + overage;
    leftBar.width = Math.round((budgeted / total) * 100);
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefOverBudgetSpent;
    rightBar.color = ColorDefOverBudgetOverSpent;

    leftBar.rawValue = integerToCurrency(budgeted);
    rightBar.rawValue = integerToCurrency(overage);

    leftBar.category = 'Budgeted';
    rightBar.category = 'Overspent';
  } else {
    // We are under budget
    const remaining = budgeted - -1 * spent;
    leftBar.width = Math.round((remaining / budgeted) * 100);
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefUnderBudgetRemaining;
    rightBar.color = ColorDefUnderBudgetSpent;

    leftBar.rawValue = integerToCurrency(remaining);
    rightBar.rawValue = integerToCurrency(spent);

    leftBar.category = 'Remaining';
    rightBar.category = 'Spent';
  }

  return [leftBar, rightBar];
}

type ProgressBarProps = {
  month: string;
  category: CategoryEntity;
};

export function ProgressBar({ month, category }: ProgressBarProps) {
  const { t } = useTranslation();
  const [leftBar, setLeftBar] = useState<ColorBar>(new ColorBar());
  const [rightBar, setRightBar] = useState<ColorBar>(new ColorBar());
  const { hoveredMonth } = useEnvelopeBudget();
  const isCurrentMonth = monthUtils.isCurrentMonth(month);

  // The budgeted amount for this month
  const budgeted = Number(
    useSheetValue<'envelope-budget', 'budget'>(
      envelopeBudget.catBudgeted(category.id),
    ),
  );
  // The amount spent this month
  const spent = Number(
    useSheetValue<'envelope-budget', 'sum-amount'>(
      envelopeBudget.catSumAmount(category.id),
    ),
  );
  /* Goal is either the template value or the goal value, so use it in conjunction with long-goal. */
  const goal = Number(
    useSheetValue<'envelope-budget', 'goal'>(
      envelopeBudget.catGoal(category.id),
    ),
  );
  // If a #goal for the category exists.
  const longGoal = Number(
    useSheetValue<'envelope-budget', 'long-goal'>(
      envelopeBudget.catLongGoal(category.id),
    ),
  );
  const isLongGoal = Boolean(longGoal && longGoal > 0);
  // The current category balance based on the budgeted, spent, and previous balance amounts
  const balance = Number(
    useSheetValue<'envelope-budget', 'leftover'>(
      envelopeBudget.catBalance(category.id),
    ),
  );

  useEffect(() => {
    const setColorBars = async () => {
      setTimeout(() => {
        // Don't show visuals for income categories
        if (category.is_income) {
          return null;
        }
        const [freshLeftBar, freshRightBar] = getColorBars(
          budgeted,
          spent,
          balance,
          goal,
          isLongGoal,
        );
        setLeftBar(freshLeftBar);
        setRightBar(freshRightBar);
      }, 100);
    };

    setColorBars();
  }, [category, budgeted, spent, balance, goal, isLongGoal, hoveredMonth]);

  const barHeight = 3;
  const borderRadius = 30;

  let barOpacity = '0.5'; // By default, all categories in all months with some activity are partly visible
  if (isCurrentMonth) {
    barOpacity = '1'; // By default, categories in the current month are fully visible
  }
  if (isCurrentMonth && hoveredMonth && hoveredMonth !== month) {
    barOpacity = '0.5'; // If a non-current month is hovered over, lower visibility for the current month
  } else if (hoveredMonth === month) {
    barOpacity = '1'; // If a non-current month is hovered over, raise that month to fully visible
  }

  return (
    <View
      style={{
        display: 'flex',
        position: 'absolute',
        right: 0,
        bottom: 0,
        marginBottom: 1,
        width: '50%',
        opacity: barOpacity,
        transition: 'opacity 0.25s',
      }}
    >
      {/* Left side of the bar */}
      <View
        style={{
          height: barHeight,
          backgroundColor: leftBar.color,
          width: `${leftBar.width}%`,
          position: 'absolute',
          bottom: 0,
          left: 0,
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
          transition: 'width 0.5s ease-in-out',
        }}
        title={`${t(leftBar.category)}: ${leftBar.rawValue}`}
      />
      {/* Right side of the bar */}
      <View
        style={{
          height: barHeight,
          backgroundColor: rightBar.color,
          width: `${rightBar.width}%`,
          position: 'absolute',
          bottom: 0,
          right: 0,
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          transition: 'width 0.5s ease-in-out',
        }}
        title={`${t(rightBar.category)}: ${rightBar.rawValue}`}
      />
    </View>
  );
}
