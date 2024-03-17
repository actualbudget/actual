import React from 'react';

import { styles, type CSSProperties, theme } from '../../style';
import {
  BalanceMenu,
  type BalanceMenuProps,
} from '../budget/rollover/BalanceMenu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

const MENU_ITEM_HEIGHT = 40;

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
    ...styles.mediumText,
    height: MENU_ITEM_HEIGHT,
    color: theme.menuItemText,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal
      title="Balance menu"
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
