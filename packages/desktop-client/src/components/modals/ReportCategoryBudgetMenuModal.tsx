import React, { type ComponentPropsWithoutRef } from 'react';

import { reportBudget } from 'loot-core/client/queries';
import { amountToInteger } from 'loot-core/shared/util';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import { CategoryBudgetMenu } from '../budget/report/CategoryBudgetMenu';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { FocusableAmountInput } from '../mobile/transactions/FocusableAmountInput';
import { type CommonModalProps } from '../Modals';
import { useSheetValue } from '../spreadsheet/useSheetValue';

type ReportCategoryBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof CategoryBudgetMenu
> & {
  modalProps: CommonModalProps;
  categoryId: string;
  onUpdateBudget: (amount: number) => void;
};

export function ReportCategoryBudgetMenuModal({
  modalProps,
  categoryId,
  onUpdateBudget,
  onCopyLastMonthAverage,
  onSetMonthsAverage,
  onApplyBudgetTemplate,
}: ReportCategoryBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const budgeted = useSheetValue(reportBudget.catBudgeted(categoryId));
  const category = useCategory(categoryId);

  const _onUpdateBudget = amount => {
    onUpdateBudget?.(amountToInteger(amount));
  };

  return (
    <Modal
      title={category?.name}
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
          focused={true}
          zeroSign="+"
          textStyle={{ ...styles.veryLargeText, textAlign: 'center' }}
          onUpdate={_onUpdateBudget}
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
