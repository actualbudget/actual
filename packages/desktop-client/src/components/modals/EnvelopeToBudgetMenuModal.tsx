import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';

import { theme, styles } from '../../style';
import { ToBudgetMenu } from '../budget/envelope/budgetsummary/ToBudgetMenu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

type EnvelopeToBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof ToBudgetMenu
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
