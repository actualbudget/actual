import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { envelopeBudget } from 'loot-core/client/queries';

import { useCategory } from '../../hooks/useCategory';
import { theme, styles } from '../../style';
import {
  BalanceWithCarryover,
  CarryoverIndicator,
} from '../budget/BalanceWithCarryover';
import { BalanceMenu } from '../budget/envelope/BalanceMenu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { CellValueText } from '../spreadsheet/CellValue';

type EnvelopeBalanceMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-balance-menu' }>['options'],
  'month'
>;

export function EnvelopeBalanceMenuModal({
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: EnvelopeBalanceMenuModalProps) {
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
    <Modal name="envelope-balance-menu">
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
              carryover={envelopeBudget.catCarryover(categoryId)}
              balance={envelopeBudget.catBalance(categoryId)}
              goal={envelopeBudget.catGoal(categoryId)}
              budgeted={envelopeBudget.catBudgeted(categoryId)}
              longGoal={envelopeBudget.catLongGoal(categoryId)}
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
            onTransfer={onTransfer}
            onCover={onCover}
          />
        </>
      )}
    </Modal>
  );
}
