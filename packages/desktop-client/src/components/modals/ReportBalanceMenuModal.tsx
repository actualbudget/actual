import React, { type ComponentPropsWithoutRef } from 'react';

import { reportBudget } from 'loot-core/client/queries';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import { BalanceWithCarryover } from '../budget/BalanceWithCarryover';
import { BalanceMenu } from '../budget/report/BalanceMenu';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type ReportBalanceMenuModalProps = ComponentPropsWithoutRef<
  typeof BalanceMenu
> & {
  modalProps: CommonModalProps;
};

export function ReportBalanceMenuModal({
  modalProps,
  categoryId,
  onCarryover,
}: ReportBalanceMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const category = useCategory(categoryId);

  if (!category) {
    return null;
  }

  return (
    <Modal
      title={`Balance: ${category.name}`}
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
        <BalanceWithCarryover
          disabled
          balanceStyle={{
            textAlign: 'center',
            ...styles.veryLargeText,
          }}
          carryoverStyle={{ right: -20, width: 15, height: 15 }}
          carryover={reportBudget.catCarryover(categoryId)}
          balance={reportBudget.catBalance(categoryId)}
          goal={reportBudget.catGoal(categoryId)}
          budgeted={reportBudget.catBudgeted(categoryId)}
        />
      </View>
      <BalanceMenu
        categoryId={categoryId}
        getItemStyle={() => defaultMenuItemStyle}
        onCarryover={onCarryover}
      />
    </Modal>
  );
}
