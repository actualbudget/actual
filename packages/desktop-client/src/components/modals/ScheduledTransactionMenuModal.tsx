import React, {
  useMemo,
  type ComponentPropsWithoutRef,
  type CSSProperties,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { format } from 'loot-core/shared/months';
import { q } from 'loot-core/shared/query';
import {
  scheduleIsRecurring,
  extractScheduleConds,
} from 'loot-core/shared/schedules';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { useLocale } from '@desktop-client/hooks/useLocale';
import { useSchedules } from '@desktop-client/hooks/useSchedules';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

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
  const locale = useLocale();
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
              <Trans>Scheduled date</Trans>
            </Text>
            <Text style={{ fontSize: 17, fontWeight: 700 }}>
              {format(schedule?.next_date || '', 'MMMM dd, yyyy', locale)}
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
  onPost: (transactionId: string, today?: boolean) => void;
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
          case 'post-today':
            onPost?.(transactionId, true);
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
        { name: 'post', text: t('Post transaction') },
        { name: 'post-today', text: t('Post transaction today') },
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
