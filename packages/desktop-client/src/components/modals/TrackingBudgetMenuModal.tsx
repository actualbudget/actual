import React, {
  useState,
  type ComponentPropsWithoutRef,
  useEffect,
} from 'react';

import { trackingBudget } from 'loot-core/client/queries';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import { BudgetMenu } from '../budget/tracking/BudgetMenu';
import { useTrackingSheetValue } from '../budget/tracking/TrackingBudgetComponents';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';

type TrackingBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof BudgetMenu
> & {
  categoryId: string;
  onUpdateBudget: (amount: number) => void;
};

export function TrackingBudgetMenuModal({
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: TrackingBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const budgeted = useTrackingSheetValue(
    trackingBudget.catBudgeted(categoryId),
  );
  const category = useCategory(categoryId);
  const [amountFocused, setAmountFocused] = useState(false);

  const _onUpdateBudget = (amount: number) => {
    onUpdateBudget?.(amountToInteger(amount));
  };

  useEffect(() => {
    setAmountFocused(true);
  }, []);

  if (!category) {
    return null;
  }

  return (
    <Modal name="tracking-budget-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={category.name} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 17,
                fontWeight: 400,
              }}
            >
              Budget
            </Text>
            <FocusableAmountInput
              value={integerToAmount(budgeted || 0)}
              focused={amountFocused}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              onEnter={close}
              zeroSign="+"
              focusedStyle={{
                width: 'auto',
                padding: '5px',
                paddingLeft: '20px',
                paddingRight: '20px',
                minWidth: '100%',
              }}
              textStyle={{ ...styles.veryLargeText, textAlign: 'center' }}
              onUpdateAmount={_onUpdateBudget}
              data-testid="budget-amount"
            />
          </View>
          <BudgetMenu
            getItemStyle={() => defaultMenuItemStyle}
            onCopyLastMonthAverage={onCopyLastMonthAverage}
            onSetMonthsAverage={onSetMonthsAverage}
            onApplyBudgetTemplate={onApplyBudgetTemplate}
          />
        </>
      )}
    </Modal>
  );
}
