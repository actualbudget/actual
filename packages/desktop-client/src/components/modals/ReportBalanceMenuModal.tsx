import React, { type ComponentPropsWithoutRef } from 'react';

import { type CSSProperties, theme, styles } from '../../style';
import { BalanceMenu } from '../budget/report/BalanceMenu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

type ReportBalanceMenuModalProps = ComponentPropsWithoutRef<
  typeof BalanceMenu
> & {
  modalProps: CommonModalProps;
};

export function ReportBalanceMenuModal({
  modalProps,
  categoryId,
  onCarryover,
}: ReportBalanceMenuModalProps) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal
      showHeader
      focusAfterClose={false}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        paddingBottom: 10,
        borderRadius: '6px',
      }}
    >
      <BalanceMenu
        categoryId={categoryId}
        getItemStyle={() => defaultMenuItemStyle}
        onCarryover={onCarryover}
      />
    </Modal>
  );
}
