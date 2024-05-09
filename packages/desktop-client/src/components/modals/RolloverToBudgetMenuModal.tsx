import React, { type ComponentPropsWithoutRef } from 'react';

import { type CSSProperties, theme, styles } from '../../style';
import { ToBudgetMenu } from '../budget/rollover/budgetsummary/ToBudgetMenu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type RolloverToBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof ToBudgetMenu
> & {
  modalProps: CommonModalProps;
};

export function RolloverToBudgetMenuModal({
  modalProps,
  onTransfer,
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
    <Modal showHeader focusAfterClose={false} {...modalProps}>
      <ToBudgetMenu
        getItemStyle={() => defaultMenuItemStyle}
        onTransfer={onTransfer}
        onHoldBuffer={onHoldBuffer}
        onResetHoldBuffer={onResetHoldBuffer}
      />
    </Modal>
  );
}
