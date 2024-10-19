import React, {
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';

import * as monthUtils from 'loot-core/shared/months';

import { theme, styles } from '../../style';
import { ToBudgetMenu } from '../budget/envelope/budgetsummary/ToBudgetMenu';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { NamespaceContext } from '../spreadsheet/NamespaceContext';

const MODAL_NAME = 'envelope-summary-to-budget-menu' as const;

type EnvelopeToBudgetMenuModalProps = ComponentPropsWithoutRef<
  typeof ToBudgetMenu
> & {
  name: typeof MODAL_NAME;
  month: string;
};

export function EnvelopeToBudgetMenuModal({
  name = MODAL_NAME,
  month,
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
}: EnvelopeToBudgetMenuModalProps) {
  return (
    <NamespaceContext.Provider value={monthUtils.sheetForMonth(month)}>
      <EnvelopeToBudgetMenuModalInner
        name={name}
        onTransfer={onTransfer}
        onCover={onCover}
        onHoldBuffer={onHoldBuffer}
        onResetHoldBuffer={onResetHoldBuffer}
      />
      </NamespaceContext.Provider>
  );
}
EnvelopeToBudgetMenuModal.modalName = MODAL_NAME;

function EnvelopeToBudgetMenuModalInner({
  name = MODAL_NAME,
  onTransfer,
  onCover,
  onHoldBuffer,
  onResetHoldBuffer,
}: Omit<EnvelopeToBudgetMenuModalProps, 'month'>) {
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };

  return (
    <Modal name={name}>
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
