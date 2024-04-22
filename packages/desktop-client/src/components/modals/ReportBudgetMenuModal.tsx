import React, {
  useState,
  type ComponentPropsWithoutRef,
  useEffect,
} from 'react';

import { reportBudget } from 'loot-core/client/queries';
import { amountToInteger, integerToAmount } from 'loot-core/shared/util';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import { BudgetMenu } from '../budget/report/BudgetMenu';
import { Modal } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';
import { type CommonModalProps } from '../Modals';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type ReportBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof BudgetMenu
> & {
  modalProps: CommonModalProps;
  categoryId: string;
  onUpdateBudget: (amount: number) => void;
};

export function ReportBudgetMenuModal({
  modalProps,
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: ReportBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const budgeted = useSheetValue(reportBudget.catBudgeted(categoryId));
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
    <Modal
      title={category.name}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      style={{
        padding: '0 10px',
        paddingBottom: 10,
      }}
    >
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
          onEnter={() => modalProps.onClose()}
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
      <BudgetMenu
        getItemStyle={() => defaultMenuItemStyle}
        onCopyLastMonthAverage={onCopyLastMonthAverage}
        onSetMonthsAverage={onSetMonthsAverage}
        onApplyBudgetTemplate={onApplyBudgetTemplate}
      />
    </Modal>
  );
}
