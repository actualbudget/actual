import React, { type ComponentPropsWithoutRef } from 'react';

import { styles, type CSSProperties, theme } from '../../style';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

const MENU_ITEM_HEIGHT = 40;

type ScheduledTransactionMenuModalProps = ScheduledTransactionMenuProps & {
  modalProps: CommonModalProps;
};

export function ScheduledTransactionMenuModal({
  modalProps,
  transactionId,
  onSkip,
  onPost,
}: ScheduledTransactionMenuModalProps) {
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
      title="Scheduled transaction menu"
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
        <ScheduledTransactionMenu
          transactionId={transactionId}
          onPost={onPost}
          onSkip={onSkip}
          getItemStyle={() => defaultMenuItemStyle}
        />
      )}
    </Modal>
  );
}

type ScheduledTransactionMenuProps = Omit<
  ComponentPropsWithoutRef<typeof Menu>,
  'onMenuSelect' | 'items'
> & {
  transactionId: string;
  onSkip: (transactionId: string) => void;
  onPost: (transactionId: string) => void;
};

function ScheduledTransactionMenu({
  transactionId,
  onSkip,
  onPost,
  ...props
}: ScheduledTransactionMenuProps) {
  return (
    <Menu
      {...props}
      onMenuSelect={name => {
        switch (name) {
          case 'post':
            onPost?.(transactionId);
            break;
          case 'skip':
            onSkip?.(transactionId);
            break;
          default:
            throw new Error(`Unsupported item: ${name}`);
        }
      }}
      items={[
        {
          name: 'post',
          text: 'Post transaction',
        },
        {
          name: 'skip',
          text: 'Skip scheduled date',
        },
      ]}
    />
  );
}
