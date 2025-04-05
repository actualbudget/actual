import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { envelopeBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';
import { integerToCurrency } from 'loot-core/shared/util';
import { type CategoryEntity } from 'loot-core/types/models';

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

  if (budgeted === 0) {
    // If we have nothing budgeted, don't show a bar for this
  } else if (isLongGoal) {
    // We have a long-term #goal set. These take visual precedence over a monthly template goal, even if both exist
    const toGoal = goal - balance;

    if (toGoal <= 0) {
      // If over the goal, consider it complete
      leftBar.width = 100;
    } else if (balance < 0) {
      // If balance is < 0, show no progress
      leftBar.width = 0;
    } else {
      // Otherwise, standard ratio with a positive balance and a positive amount to reach the goal
      leftBar.width = bound(Math.round((balance / goal) * 100), 0, 100);
    }
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefGoalSaved;
    rightBar.color = ColorDefGoalRemaining;

    leftBar.rawValue = integerToCurrency(balance);
    rightBar.rawValue = integerToCurrency(toGoal);

    leftBar.category = 'Saved';
    rightBar.category = 'Remaining';
  } else if (balance < 0) {
    // We spent more than or equal to the pre-spending category balance.
    // Overspending will be relative to the prior balance plus budgeted amount
    const available = balance - spent;
    const total = -spent; // Spending becomes the divisor instead of pre-spending balance
    leftBar.width = bound(Math.round((available / total) * 100), 0, 100);
    rightBar.width = 100 - leftBar.width;

    leftBar.color = ColorDefOverBudgetSpent;
    rightBar.color = ColorDefOverBudgetOverSpent;

    leftBar.rawValue = integerToCurrency(available);
    rightBar.rawValue = integerToCurrency(balance);

    leftBar.category = 'Available';
    rightBar.category = 'Overspent';
  } else {
    // We are under budget.
    const total = balance - spent;
    rightBar.width = bound(Math.round((balance / total) * 100), 0, 100);
    leftBar.width = 100 - rightBar.width;

    rightBar.color = ColorDefUnderBudgetRemaining;
    leftBar.color = ColorDefUnderBudgetSpent;

    rightBar.rawValue = integerToCurrency(balance);
    leftBar.rawValue = integerToCurrency(spent);

    rightBar.category = 'Remaining';
    leftBar.category = 'Spent';
  }

  return [leftBar, rightBar];
}

function bound(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(val, max));
}

type ProgressBarProps = {
  month: string;
  category: CategoryEntity;
  isMobile?: boolean;
};

export function ProgressBar({
  month,
  category,
  isMobile = false,
}: ProgressBarProps) {
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
    // Don't show visuals for income categories
    if (category.is_income) {
      return;
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
  }, [category, budgeted, spent, balance, goal, isLongGoal]);

  const BAR_HEIGHT = 3;
  const BORDER_RADIUS = 30;
  const PARTIAL_OPACITY = '0.4';
  const FULL_OPACITY = '1';

  // Default styling
  let barOpacity = PARTIAL_OPACITY; // By default, all categories in all months with some activity are partly visible
  if (isCurrentMonth) {
    barOpacity = FULL_OPACITY; // By default, categories in the current month are fully visible
  }

  // Styling during a hover event
  if (isCurrentMonth && hoveredMonth && hoveredMonth !== month) {
    barOpacity = PARTIAL_OPACITY; // If a non-current month is hovered over, lower visibility for the current month
  } else if (hoveredMonth === month) {
    barOpacity = FULL_OPACITY; // If a non-current month is hovered over, raise that month to fully visible
  }

  // Always fully visible on mobile
  if (isMobile) {
    barOpacity = FULL_OPACITY;
  }

  return (
    <View
      style={{
        display: 'flex',
        position: 'absolute',
        right: 0,
        bottom: 0,
        marginBottom: isMobile ? -12 : 0,
        width: '100%',
        opacity: barOpacity,
        transition: 'opacity 0.25s',
      }}
    >
      {/* Left side of the bar */}
      <View
        style={{
          height: BAR_HEIGHT,
          backgroundColor: leftBar.color,
          width: `${leftBar.width}%`,
          position: 'absolute',
          bottom: 0,
          left: 0,
          borderTopLeftRadius: BORDER_RADIUS,
          borderBottomLeftRadius: BORDER_RADIUS,
          transition: 'width 0.5s ease-in-out',
        }}
        title={`${t(leftBar.category)}: ${leftBar.rawValue}`}
      />
      {/* Right side of the bar */}
      <View
        style={{
          height: BAR_HEIGHT,
          backgroundColor: rightBar.color,
          width: `${rightBar.width}%`,
          position: 'absolute',
          bottom: 0,
          right: 0,
          borderTopRightRadius: BORDER_RADIUS,
          borderBottomRightRadius: BORDER_RADIUS,
          transition: 'width 0.5s ease-in-out',
        }}
        title={`${t(rightBar.category)}: ${rightBar.rawValue}`}
      />
    </View>
  );
}
