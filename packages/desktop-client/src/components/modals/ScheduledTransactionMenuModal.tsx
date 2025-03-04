import React, {
  useMemo,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';
import { format } from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  scheduleIsRecurring,
  extractScheduleConds,
} from 'loot-core/shared/schedules';

import { theme } from '../../style';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '../common/Modal';

type ScheduledTransactionMenuModalProps = Extract<
  ModalType,
  { name: 'scheduled-transaction-menu' }
>['options'];

export function ScheduledTransactionMenuModal({
  transactionId,
  onSkip,
  onPost,
  onComplete,
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
  const { date: dateCond } = extractScheduleConds(schedule._conditions);

  const canBeSkipped = scheduleIsRecurring(dateCond);
  const canBeCompleted = !scheduleIsRecurring(dateCond);

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
            onComplete={onComplete}
            canBeSkipped={canBeSkipped}
            canBeCompleted={canBeCompleted}
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
  onComplete: (transactionId: string) => void;
};

function ScheduledTransactionMenu({
  transactionId,
  onSkip,
  onPost,
  onComplete,
  canBeSkipped,
  canBeCompleted,
  ...props
}: ScheduledTransactionMenuProps & {
  canBeCompleted: boolean;
  canBeSkipped: boolean;
}) {
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
          case 'complete':
            onComplete?.(transactionId);
            break;
          default:
            throw new Error(`Unrecognized menu option: ${name}`);
        }
      }}
      items={[
        { name: 'post', text: t('Post transaction today') },
        ...(canBeSkipped
          ? [{ name: 'skip', text: t('Skip next scheduled date') }]
          : []),
        ...(canBeCompleted
          ? [{ name: 'complete', text: t('Mark as completed') }]
          : []),
      ]}
    />
  );
}
