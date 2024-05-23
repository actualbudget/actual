import React, { useCallback, type ComponentPropsWithoutRef } from 'react';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { format } from 'loot-core/shared/months';
import { type Query } from 'loot-core/shared/query';

import { type CSSProperties, theme, styles } from '../../style';
import { Menu } from '../common/Menu';
import { Modal } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
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
  const scheduleId = transactionId?.split('/')?.[1];
  const scheduleData = useSchedules({
    transform: useCallback(
      (q: Query) => q.filter({ id: scheduleId }),
      [scheduleId],
    ),
  });
  const schedule = scheduleData?.schedules?.[0];

  if (!schedule) {
    return null;
  }

  return (
    <Modal
      title={schedule.name}
      showHeader
      focusAfterClose={false}
      {...modalProps}
    >
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: 400 }}>Scheduled date</Text>
        <Text style={{ fontSize: 17, fontWeight: 700 }}>
          {format(schedule.next_date, 'MMMM dd, yyyy')}
        </Text>
      </View>
      <ScheduledTransactionMenu
        transactionId={transactionId}
        onPost={onPost}
        onSkip={onSkip}
        getItemStyle={() => defaultMenuItemStyle}
      />
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
            throw new Error(`Unrecognized menu option: ${name}`);
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
