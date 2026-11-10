import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';
import { format } from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';
import {
  extractScheduleConds,
  scheduleIsRecurring,
} from '@actual-app/core/shared/schedules';

import { MobileSheet } from '#components/mobile/MobileSheet';
import { MobileSheetRow } from '#components/mobile/MobileSheetRow';
import { MobileSheetSection } from '#components/mobile/MobileSheetSection';
import { useLocale } from '#hooks/useLocale';
import { useSchedules } from '#hooks/useSchedules';
import type { Modal as ModalType } from '#modals/modalsSlice';

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
  const locale = useLocale();
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
  if (!schedule) {
    return null;
  }

  const { date: dateCond } = extractScheduleConds(schedule._conditions);

  const canBeSkipped = scheduleIsRecurring(dateCond);
  const canBeCompleted = !scheduleIsRecurring(dateCond);

  return (
    <MobileSheet
      name="scheduled-transaction-menu"
      title={schedule.name || t('Schedule')}
    >
      <View
        style={{
          alignItems: 'center',
          padding: `${spacing.xs}px ${spacing.md}px ${spacing.md}px`,
        }}
      >
        <Text
          style={{
            ...styles.smallText,
            color: theme.pageTextLight,
            marginBottom: spacing.xxs,
          }}
        >
          <Trans>Scheduled date</Trans>
        </Text>
        <Text style={{ ...styles.mediumText, fontWeight: 600 }}>
          {format(schedule.next_date || '', 'MMMM dd, yyyy', locale)}
        </Text>
      </View>

      <MobileSheetSection>
        <MobileSheetRow
          label={t('Post transaction')}
          onPress={() => onPost(transactionId)}
        />
        <MobileSheetRow
          label={t('Post transaction today')}
          onPress={() => onPost(transactionId, true)}
        />
        {canBeSkipped && (
          <MobileSheetRow
            label={t('Skip next scheduled date')}
            onPress={() => onSkip(transactionId)}
          />
        )}
        {canBeCompleted && (
          <MobileSheetRow
            label={t('Mark as completed')}
            onPress={() => onComplete(transactionId)}
          />
        )}
      </MobileSheetSection>
    </MobileSheet>
  );
}
