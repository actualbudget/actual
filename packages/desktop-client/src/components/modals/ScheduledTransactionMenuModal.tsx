import React, { type ComponentPropsWithoutRef } from 'react';

import { type CSSProperties, theme, styles } from '../../style';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { type CommonModalProps } from '../Modals';

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
