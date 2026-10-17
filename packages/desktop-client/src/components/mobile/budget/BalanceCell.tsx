import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';

import { BalanceWithCarryover } from '#components/budget/BalanceWithCarryover';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import type { Binding } from '#spreadsheet';

import { CategoryAmountText } from './CategoryAmountText';
import { MobileCarryoverIndicator } from './MobileCarryoverIndicator';

type BalanceCellProps = {
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  category: CategoryEntity;
  getAriaLabel: (formattedValue: string) => string;
};

export function BalanceCell({
  binding,
  category,
  getAriaLabel,
}: BalanceCellProps) {
  const bindings = useBudgetBindings();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
      }}
    >
      <View style={{ position: 'relative', maxWidth: '100%' }}>
        <BalanceWithCarryover
          type="financial"
          carryover={bindings.catCarryover(category.id)}
          balance={binding}
          goal={bindings.catGoal(category.id)}
          budgeted={bindings.catBudgeted(category.id)}
          longGoal={bindings.catLongGoal(category.id)}
          isDisabled
          CarryoverIndicator={MobileCarryoverIndicator}
        >
          {({ value, className: defaultClassName }) => (
            <CategoryAmountText
              value={value}
              getAriaLabel={getAriaLabel}
              className={cx(
                defaultClassName,
                css({
                  ...styles.tnum,
                  textAlign: 'right',
                  ...styles.verySmallText,
                  fontWeight: 700,
                }),
              )}
            />
          )}
        </BalanceWithCarryover>
      </View>
    </View>
  );
}
