import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';

import { envelopeBudget } from 'loot-core/client/queries';
import * as monthUtils from 'loot-core/shared/months';

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
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'envelope-balance-menu' as const;

type EnvelopeBalanceMenuModalProps = ComponentPropsWithoutRef<
  typeof BalanceMenu
> & {
  name: typeof MODAL_NAME;
  month: string;
};

export function EnvelopeBalanceMenuModal({
  name = MODAL_NAME,
  month,
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: EnvelopeBalanceMenuModalProps) {
  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <EnvelopeBalanceMenuModalInner
        name={name}
        categoryId={categoryId}
        onCarryover={onCarryover}
        onTransfer={onTransfer}
        onCover={onCover}
      />
    </NamespaceContext.Provider>
  );
}
EnvelopeBalanceMenuModal.modalName = MODAL_NAME;

function EnvelopeBalanceMenuModalInner({
  name = MODAL_NAME,
  categoryId,
  onCarryover,
  onTransfer,
  onCover,
}: Omit<EnvelopeBalanceMenuModalProps, 'month'>) {
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
