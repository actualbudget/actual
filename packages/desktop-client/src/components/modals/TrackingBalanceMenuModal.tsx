import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';

import { trackingBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';

import { useCategory } from '../../hooks/useCategory';
import { theme, styles } from '../../style';
import {
  BalanceWithCarryover,
  CarryoverIndicator,
} from '../budget/BalanceWithCarryover';
import { BalanceMenu } from '../budget/tracking/BalanceMenu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { CellValueText } from '../spreadsheet/CellValue';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'tracking-balance-menu' as const;

type TrackingBalanceMenuModalProps = ComponentPropsWithoutRef<
  typeof BalanceMenu
> & {
  name: typeof MODAL_NAME;
  month: string;
};

export function TrackingBalanceMenuModal({
  name = MODAL_NAME,
  month,
  categoryId,
  onCarryover,
}: TrackingBalanceMenuModalProps) {
  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <TrackingBalanceMenuModalInner
        name={name}
        categoryId={categoryId}
        onCarryover={onCarryover}
      />
    </NamespaceContext.Provider>
  );
}
TrackingBalanceMenuModal.modalName = MODAL_NAME;

function TrackingBalanceMenuModalInner({
  name = MODAL_NAME,
  categoryId,
  onCarryover,
}: Omit<TrackingBalanceMenuModalProps, 'month'>) {
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
    <Modal name={name}>
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
              isDisabled
              carryover={trackingBudget.catCarryover(categoryId)}
              balance={trackingBudget.catBalance(categoryId)}
              goal={trackingBudget.catGoal(categoryId)}
              budgeted={trackingBudget.catBudgeted(categoryId)}
              longGoal={trackingBudget.catLongGoal(categoryId)}
              CarryoverIndicator={({ style }) => (
                <CarryoverIndicator
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
                <CellValueText
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
