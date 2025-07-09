import { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgArrowThickRight } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';

import { type CategoryEntity } from 'loot-core/types/models';

import { getColumnWidth, PILL_STYLE } from './BudgetTable';

import { BalanceWithCarryover } from '@desktop-client/components/budget/BalanceWithCarryover';
import { PrivacyFilter } from '@desktop-client/components/PrivacyFilter';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { type Binding } from '@desktop-client/spreadsheet';
import {
  envelopeBudget,
  trackingBudget,
} from '@desktop-client/spreadsheet/bindings';

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
      CarryoverIndicator={MobileCarryoverIndicator}
    >
      {({ type, value, className: defaultClassName }) => (
        <Button
          variant="bare"
          style={{
            ...PILL_STYLE,
            maxWidth: columnWidth,
          }}
          onPress={onPress}
          aria-label={ariaLabel}
        >
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
                  maxWidth: columnWidth,
                  textAlign: 'right',
                  fontSize: 12,
                }),
              )}
            >
              {format(value, type)}
            </AutoTextSize>
          </PrivacyFilter>
        </Button>
      )}
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
