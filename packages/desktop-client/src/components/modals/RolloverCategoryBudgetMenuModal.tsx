import React, { useState, type ComponentPropsWithoutRef } from 'react';

import { rolloverBudget } from 'loot-core/client/queries';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import { CategoryBudgetMenu } from '../budget/rollover/CategoryBudgetMenu';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';
import { type CommonModalProps } from '../Modals';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type RolloverCategoryBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof CategoryBudgetMenu
> & {
  modalProps: CommonModalProps;
  categoryId: string;
  onUpdateBudget: (amount: number) => void;
};

export function RolloverCategoryBudgetMenuModal({
  modalProps,
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: RolloverCategoryBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const budgeted = useSheetValue(rolloverBudget.catBudgeted(categoryId));
  const category = useCategory(categoryId);
  const [amountFocused, setAmountFocused] = useState(false);

  const _onUpdateBudget = (amount: number) => {
    onUpdateBudget?.(amountToInteger(amount));
  };

  return (
    <Modal
      title={`Budget: ${category?.name}`}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        paddingBottom: 10,
        borderRadius: '6px',
      }}
    >
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <FocusableAmountInput
          value={integerToAmount(budgeted || 0)}
          focused={amountFocused}
          onFocus={() => setAmountFocused(true)}
          onBlur={() => setAmountFocused(false)}
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
        />
      </View>
      <CategoryBudgetMenu
        getItemStyle={() => defaultMenuItemStyle}
        onCopyLastMonthAverage={onCopyLastMonthAverage}
        onSetMonthsAverage={onSetMonthsAverage}
        onApplyBudgetTemplate={onApplyBudgetTemplate}
      />
    </Modal>
  );
}
