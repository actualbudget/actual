import React from 'react';

import { type CSSProperties, theme, styles } from '../../style';
import {
  BalanceMenu,
  type BalanceMenuProps,
} from '../budget/rollover/BalanceMenu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type RolloverBalanceMenuModalProps = BalanceMenuProps & {
  modalProps: CommonModalProps;
};

export function RolloverBalanceMenuModal({
  modalProps,
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

  return (
    <Modal
      title="Actions"
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        borderRadius: '6px',
      }}
    >
      {() => (
        <BalanceMenu
          categoryId={categoryId}
          getItemStyle={() => defaultMenuItemStyle}
          onCarryover={onCarryover}
          onTransfer={onTransfer}
          onCover={onCover}
        />
      )}
    </Modal>
  );
}
