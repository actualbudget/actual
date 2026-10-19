import { styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models';
import { css, cx } from '@emotion/css';

import { BalanceWithCarryover } from '#components/budget/BalanceWithCarryover';
import { useBudgetBindings } from '#hooks/useBudgetBindings';
import { useSheetValue } from '#hooks/useSheetValue';
import type { Binding } from '#spreadsheet';

import { CategoryAmountText } from './CategoryAmountText';
import { MobileCarryoverIndicator } from './MobileCarryoverIndicator';

type BalanceCellProps = {
  binding: Binding<
    'envelope-budget' | 'tracking-budget',
    'leftover' | 'sum-amount'
  >;
  category: CategoryEntity;
  getAriaLabel: (formattedValue: string, isCarryover: boolean) => string;
};

export function BalanceCell({
  binding,
  category,
  getAriaLabel,
}: BalanceCellProps) {
  const bindings = useBudgetBindings();
  const carryover = useSheetValue<
    'envelope-budget' | 'tracking-budget',
    'carryover'
  >(bindings.catCarryover(category.id));
  const isCarryover = Boolean(carryover);

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
              getAriaLabel={amount => getAriaLabel(amount, isCarryover)}
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
