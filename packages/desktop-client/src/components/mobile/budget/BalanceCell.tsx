import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowThickRight } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import { BalanceWithCarryover } from '#components/budget/BalanceWithCarryover';
import {
  getGoalRingLabel,
  GoalProgressRing,
} from '#components/budget/GoalProgressRing';
import { PrivacyFilter } from '#components/PrivacyFilter';
import { useFormat } from '#hooks/useFormat';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Binding } from '#spreadsheet';
import { envelopeBudget, trackingBudget } from '#spreadsheet/bindings';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

// Room for the goal progress ring, its gap and the pill padding
const RING_RESERVE = 28;

type BalanceCellProps = {
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  category: CategoryEntity;
  show3Columns?: boolean;
  onPress?: () => void;
  'aria-label'?: string;
};

export function BalanceCell({
  binding,
  category,
  show3Columns,
  onPress,
  'aria-label': ariaLabel,
}: BalanceCellProps) {
  const { t } = useTranslation();
  const [budgetType = 'envelope'] = useSyncedPref('budgetType');
  const columnWidth = getColumnWidth({
    show3Columns,
  });

  const goal =
    budgetType === 'tracking'
      ? trackingBudget.catGoal(category.id)
      : envelopeBudget.catGoal(category.id);

  const longGoal =
    budgetType === 'tracking'
      ? trackingBudget.catLongGoal(category.id)
      : envelopeBudget.catLongGoal(category.id);

  const budgeted =
    budgetType === 'tracking'
      ? trackingBudget.catBudgeted(category.id)
      : envelopeBudget.catBudgeted(category.id);

  const carryover =
    budgetType === 'tracking'
      ? trackingBudget.catCarryover(category.id)
      : envelopeBudget.catCarryover(category.id);

  const format = useFormat();

  return (
    <BalanceWithCarryover
      aria-label={t('Balance for {{categoryName}} category', {
        categoryName: category.name,
      })} // Translated aria-label
      type="financial"
      carryover={carryover}
      balance={binding}
      goal={goal}
      budgeted={budgeted}
      longGoal={longGoal}
      isIncome={category.is_income}
      CarryoverIndicator={MobileCarryoverIndicator}
    >
      {({ type, value, className: defaultClassName }, ringProgress) => {
        const hasRing = ringProgress != null;
        const amount = (
          <PrivacyFilter>
            <AutoTextSize
              key={value}
              as={Text}
              minFontSizePx={6}
              maxFontSizePx={12}
              mode="oneline"
              className={cx(
                defaultClassName,
                css({
                  ...styles.tnum,
                  maxWidth: columnWidth,
                  textAlign: 'right',
                  fontSize: 12,
                  // AutoTextSize rounds widths, so a fraction of a pixel can overflow
                  ...(hasRing && { textOverflow: 'clip' }),
                }),
              )}
            >
              {format(value, type)}
            </AutoTextSize>
          </PrivacyFilter>
        );
        return (
          <Button
            variant="bare"
            style={{
              ...PILL_STYLE,
              // AutoTextSize leaves alignItems on the button, so set it back
              ...(hasRing && { gap: 4, alignItems: 'center' }),
              maxWidth: columnWidth,
            }}
            onPress={onPress}
            aria-label={
              hasRing && ariaLabel
                ? t('{{label}}, {{status}}', {
                    label: ariaLabel,
                    status: getGoalRingLabel(ringProgress, t),
                  })
                : ariaLabel
            }
          >
            {hasRing ? (
              <>
                <GoalProgressRing progress={ringProgress} />
                {/* AutoTextSize sizes against its parent, so keep the ring out of it */}
                <span
                  style={{
                    minWidth: 0,
                    maxWidth: `calc(${columnWidth} - ${RING_RESERVE}px)`,
                  }}
                >
                  {amount}
                </span>
              </>
            ) : (
              amount
            )}
          </Button>
        );
      }}
    </BalanceWithCarryover>
  );
}

function MobileCarryoverIndicator({ style }: { style?: CSSProperties }) {
  return (
    <View
      style={{
        position: 'absolute',
        right: '-3px',
        top: '-5px',
        borderRadius: '50%',
        backgroundColor: style?.color ?? theme.pillText,
      }}
    >
      <SvgArrowThickRight
        width={11}
        height={11}
        style={{ color: theme.pillBackgroundLight }}
      />
    </View>
  );
}
