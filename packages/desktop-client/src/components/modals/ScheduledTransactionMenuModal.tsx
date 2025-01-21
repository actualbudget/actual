import React, {
  useMemo,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { format } from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';

import { theme, styles } from '../../style';
import { Menu } from '../common/Menu';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';

type ScheduledTransactionMenuModalProps = Extract<
  ModalType,
  { name: 'scheduled-transaction-menu' }
>['options'];

export function ScheduledTransactionMenuModal({
  transactionId,
  onSkip,
  onPost,
}: ScheduledTransactionMenuModalProps) {
  const { t } = useTranslation();
  const defaultMenuItemStyle: CSSProperties = {
    ...styles.mobileMenuItem,
    color: theme.menuItemText,
    borderRadius: 0,
    borderTop: `1px solid ${theme.pillBorder}`,
  };
  const scheduleId = transactionId?.split('/')?.[1];
  const schedulesQuery = useMemo(
    () => q('schedules').filter({ id: scheduleId }).select('*'),
    [scheduleId],
  );
  const { isLoading: isSchedulesLoading, schedules } = useSchedules({
    query: schedulesQuery,
  });

  if (isSchedulesLoading) {
    return null;
  }

  const schedule = schedules?.[0];

  return (
    <Modal name="scheduled-transaction-menu">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={<ModalTitle title={schedule?.name || ''} shrinkOnOverflow />}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View
            style={{
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: 400 }}>
              {t('Scheduled date')}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: 700 }}>
              {format(schedule?.next_date || '', 'MMMM dd, yyyy')}
            </Text>
          </View>
          <ScheduledTransactionMenu
            transactionId={transactionId}
            onPost={onPost}
            onSkip={onSkip}
            getItemStyle={() => defaultMenuItemStyle}
          />
        </>
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
  const { t } = useTranslation();
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
          text: t('Post transaction today'),
        },
        {
          name: 'skip',
          text: t('Skip scheduled date'),
        },
      ]}
    />
  );
}
