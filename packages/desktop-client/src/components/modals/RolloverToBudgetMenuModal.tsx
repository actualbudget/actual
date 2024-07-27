import React, { type ComponentPropsWithoutRef } from 'react';

import { type CSSProperties, theme, styles } from '../../style';
import { ToBudgetMenu } from '../budget/rollover/budgetsummary/ToBudgetMenu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';

type RolloverToBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof ToBudgetMenu
>;

export function RolloverToBudgetMenuModal({
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
}: RolloverToBudgetMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal name="rollover-summary-to-budget-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            showLogo
            rightContent={<ModalCloseButton onClick={close} />}
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
