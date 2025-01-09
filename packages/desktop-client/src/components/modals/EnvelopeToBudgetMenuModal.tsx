import React, { type CSSProperties } from 'react';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { theme, styles } from '../../style';
import { ToBudgetMenu } from '../budget/envelope/budgetsummary/ToBudgetMenu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

type EnvelopeToBudgetMenuModalProps = Omit<
  Extract<ModalType, { name: 'envelope-summary-to-budget-menu' }>['options'],
  'month'
>;

export function EnvelopeToBudgetMenuModal({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
}: EnvelopeToBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal name="envelope-summary-to-budget-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            showLogo
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <ToBudgetMenu
            getItemStyle={() => defaultMenuItemStyle}
            onTransfer={onTransfer}
            onCover={onCover}
            onHoldBuffer={onHoldBuffer}
            onResetHoldBuffer={onResetHoldBuffer}
          />
        </>
      )}
    </Modal>
  );
}
