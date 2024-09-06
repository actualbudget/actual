import React, { type ComponentPropsWithoutRef } from 'react';

import { reportBudget } from 'loot-core/client/queries';

import { useCategory } from '../../hooks/useCategory';
import { type CSSProperties, theme, styles } from '../../style';
import {
  BalanceWithCarryover,
  DefaultCarryoverIndicator,
} from '../budget/BalanceWithCarryover';
import { BalanceMenu } from '../budget/report/BalanceMenu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { DefaultCellValueText } from '../spreadsheet/CellValue';

type ReportBalanceMenuModalProps = ComponentPropsWithoutRef<typeof BalanceMenu>;

export function ReportBalanceMenuModal({
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
    <Modal name="report-balance-menu">
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
              carryover={reportBudget.catCarryover(categoryId)}
              balance={reportBudget.catBalance(categoryId)}
              goal={reportBudget.catGoal(categoryId)}
              budgeted={reportBudget.catBudgeted(categoryId)}
              longGoal={reportBudget.catLongGoal(categoryId)}
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
                  style={{
                    textAlign: 'center',
                    ...styles.veryLargeText,
                  }}
                />
              )}
            </BalanceWithCarryover>
          </View>
          <BalanceMenu
            categoryId={categoryId}
            getItemStyle={() => defaultMenuItemStyle}
            onCarryover={onCarryover}
          />
        </>
      )}
    </Modal>
  );
}
