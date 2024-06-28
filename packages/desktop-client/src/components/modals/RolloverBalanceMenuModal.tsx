import React, { type ComponentPropsWithoutRef } from 'react';

import { rolloverBudget } from 'loot-core/client/queries';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import { BalanceWithCarryover } from '../budget/BalanceWithCarryover';
import { BalanceMenu } from '../budget/rollover/BalanceMenu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal2';
import { Text } from '../common/Text';
import { View } from '../common/View';

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
            rightContent={<ModalCloseButton onClick={close} />}
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
              style={{
                textAlign: 'center',
                ...styles.veryLargeText,
              }}
              carryoverStyle={{ right: -20, width: 15, height: 15 }}
              carryover={rolloverBudget.catCarryover(categoryId)}
              balance={rolloverBudget.catBalance(categoryId)}
              goal={rolloverBudget.catGoal(categoryId)}
              budgeted={rolloverBudget.catBudgeted(categoryId)}
            />
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
