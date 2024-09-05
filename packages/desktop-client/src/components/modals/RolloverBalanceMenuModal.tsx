import React, { type ComponentPropsWithoutRef } from 'react';

import { rolloverBudget } from 'loot-core/client/queries';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import {
  BalanceWithCarryover,
  DefaultCarryoverIndicator,
} from '../budget/BalanceWithCarryover';
import { BalanceMenu } from '../budget/rollover/BalanceMenu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { DefaultCellValueText } from '../spreadsheet/CellValue';

type RolloverBalanceMenuModalProps = ComponentPropsWithoutRef<
  typeof BalanceMenu
>;

export function RolloverBalanceMenuModal({
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: RolloverBalanceMenuModalProps) {
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
    <Modal name="rollover-balance-menu">
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
              Balance
            </Text>
            <BalanceWithCarryover
              disabled
              carryover={rolloverBudget.catCarryover(categoryId)}
              balance={rolloverBudget.catBalance(categoryId)}
              goal={rolloverBudget.catGoal(categoryId)}
              budgeted={rolloverBudget.catBudgeted(categoryId)}
              longGoal={rolloverBudget.catLongGoal(categoryId)}
              CarryoverIndicator={({ style }) => (
                <DefaultCarryoverIndicator
                  style={{
                    width: 15,
                    height: 15,
                    display: 'inline-flex',
                    position: 'relative',
                    ...style,
                  }}
                />
              )}
            >
              {props => (
                <DefaultCellValueText
                  {...props}
                  getStyle={() => ({
                    textAlign: 'center',
                    ...styles.veryLargeText,
                  })}
                />
              )}
            </BalanceWithCarryover>
          </View>
          <BalanceMenu
            categoryId={categoryId}
            getItemStyle={() => defaultMenuItemStyle}
            onCarryover={onCarryover}
            onTransfer={onTransfer}
            onCover={onCover}
          />
        </>
      )}
    </Modal>
  );
}
