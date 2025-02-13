import { useState, useEffect } from 'react';

import { View } from '@actual-app/components/view';

import { envelopeBudget } from 'loot-core/client/queries';
import { integerToCurrency } from 'loot-core/shared/util';

import { type CategoryEntity } from '../../../../loot-core/src/types/models';
import { useSheetValue } from '../spreadsheet/useSheetValue';

enum ColorDefinitions {
  UnderBudgetRemaining = '#006309', // Dark green
  UnderBudgetSpent = '#beffa8', // Light green
  OverBudgetSpent = '#979797', // Dark gray
  OverBudgetOverSpent = '#c40000', // Red
  GoalRemaining = '#90a7fd', // Light blue 90a7fd
  GoalSaved = '#001a7b', // Blue
  Empty = '', // No color for default
}

class ColorBar {
  color: string;
  width: number;
  category: string;
  rawValue: string;

  constructor(
    color: string = ColorDefinitions.Empty,
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
    // We have a long-term goal set.
    // Note that long term goals take visual precedence over a monthly template goal, even if both exist
    leftBar.width = Math.min(Math.round((balance / goal) * 100), 100);
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefinitions.GoalSaved;
    rightBar.color = ColorDefinitions.GoalRemaining;

    leftBar.rawValue = integerToCurrency(balance);
    rightBar.rawValue = integerToCurrency(goal - balance);

    leftBar.category = 'Saved';
    rightBar.category = 'Remaining';
  } else if (spent * -1 >= budgeted) {
    // We overspent (or are exactly at budget)
    const overage = -1 * spent - budgeted;
    const total = budgeted + overage;
    leftBar.width = Math.round((budgeted / total) * 100);
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefinitions.OverBudgetSpent;
    rightBar.color = ColorDefinitions.OverBudgetOverSpent;

    leftBar.rawValue = integerToCurrency(budgeted);
    rightBar.rawValue = integerToCurrency(overage);

    leftBar.category = 'Budgeted';
    rightBar.category = 'Overspent';
  } else {
    // We are under budget
    const remaining = budgeted - -1 * spent;
    leftBar.width = Math.round((remaining / budgeted) * 100);
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefinitions.UnderBudgetRemaining;
    rightBar.color = ColorDefinitions.UnderBudgetSpent;

    leftBar.rawValue = integerToCurrency(remaining);
    rightBar.rawValue = integerToCurrency(spent);

    leftBar.category = 'Remaining';
    rightBar.category = 'Spent';
  }

  return [leftBar, rightBar];
}

type CategoryVisualProps = {
  category: CategoryEntity;
};

export function CategoryVisual({ category }: CategoryVisualProps) {
  const [leftBar, setLeftBar] = useState<ColorBar>(new ColorBar());
  const [rightBar, setRightBar] = useState<ColorBar>(new ColorBar());

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
  }, [category, budgeted, spent, balance, goal, isLongGoal]);

  const barHeight = 5;
  const borderRadius = 10;

  return (
    <View style={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
      {/* Left side of the bar */}
      <View
        style={{
          height: barHeight,
          backgroundColor: leftBar.color,
          width: `${leftBar.width}%`,
          float: 'left',
          marginBottom: 2,
          borderTopLeftRadius: borderRadius,
          borderBottomLeftRadius: borderRadius,
          transition: 'width 0.5s ease-in-out',
        }}
        title={`${leftBar.category}: ${leftBar.rawValue}`}
      />
      {/* Right side of the bar */}
      <View
        style={{
          height: barHeight,
          backgroundColor: rightBar.color,
          width: `${rightBar.width}%`,
          float: 'right',
          borderTopRightRadius: borderRadius,
          borderBottomRightRadius: borderRadius,
          transition: 'width 0.5s ease-in-out',
        }}
        title={`${rightBar.category}: ${rightBar.rawValue}`}
      />
    </View>
  );
}
