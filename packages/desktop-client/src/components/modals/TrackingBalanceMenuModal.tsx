import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { trackingBudget } from 'loot-core/client/queries';

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

type TrackingBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'tracking-balance-menu' }>['options'],
  'month'
>;

export function TrackingBalanceMenuModal({
  categoryId,
  onCarryover,
}: TrackingBalanceMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  const { t } = useTranslation();
  const category = useCategory(categoryId);

  if (!category) {
    return null;
  }

  return (
    <Modal name="tracking-balance-menu">
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
              {t('Balance')}
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
