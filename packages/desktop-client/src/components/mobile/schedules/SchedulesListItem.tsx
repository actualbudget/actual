import React from 'react';
import type { GridListItemProps } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SpaceBetween } from '@actual-app/components/space-between';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { format as monthUtilFormat } from 'loot-core/shared/months';
import type { ScheduleStatusType } from 'loot-core/shared/schedules';
import { getScheduledAmount } from 'loot-core/shared/schedules';
import type { ScheduleEntity } from 'loot-core/types/models';
import type { WithRequired } from 'loot-core/types/util';

import { ActionableGridListItem } from '@desktop-client/components/mobile/ActionableGridListItem';
import { StatusBadge } from '@desktop-client/components/schedules/StatusBadge';
import { DisplayId } from '@desktop-client/components/util/DisplayId';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useFormat } from '@desktop-client/hooks/useFormat';

type SchedulesListItemProps = {
  onDelete: () => void;
  status: ScheduleStatusType;
} & WithRequired<GridListItemProps<ScheduleEntity>, 'value'>;

export function SchedulesListItem({
  value: schedule,
  onDelete,
  status,
  style,
  ...props
}: SchedulesListItemProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const amount = getScheduledAmount(schedule._amount);
  const amountStr =
    (schedule._amountOp === 'isapprox' || schedule._amountOp === 'isbetween'
      ? '~'
      : '') +
    (amount > 0 ? '+' : '') +
    format(Math.abs(amount || 0), 'financial');

  return (
    <ActionableGridListItem
      id={schedule.id}
      value={schedule}
      textValue={schedule.name || t('Unnamed schedule')}
      style={{ ...styles.mobileListItem, padding: '8px 16px', ...style }}
      actions={
        <Button
          variant="bare"
          onPress={onDelete}
          style={{
            color: theme.errorText,
            width: '100%',
          }}
        >
          <Trans>Delete</Trans>
        </Button>
      }
      {...props}
    >
      <SpaceBetween
        gap={12}
        style={{ alignItems: 'flex-start', width: '100%' }}
      >
        <View
          style={{
            flex: 1,
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {/* Schedule name */}
          <Text
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: schedule.name
                ? theme.pageText
                : theme.buttonNormalDisabledText,
            }}
          >
            {schedule.name || t('Unnamed schedule')}
          </Text>

          {/* Payee and Account */}
          <SpaceBetween gap={4} style={{ flexWrap: 'wrap' }}>
            <SpaceBetween gap={4} direction="horizontal">
              <Text style={{ color: theme.pageTextSubdued }}>
                <Trans>Payee:</Trans>
              </Text>
              <DisplayId type="payees" id={schedule._payee} />
            </SpaceBetween>
            <SpaceBetween gap={4} direction="horizontal">
              <Text style={{ color: theme.pageTextSubdued }}>
                <Trans>Account:</Trans>
              </Text>
              <DisplayId type="accounts" id={schedule._account} />
            </SpaceBetween>
          </SpaceBetween>

          {/* Amount and Date */}
          <SpaceBetween gap={8} style={{ flexWrap: 'wrap' }}>
            <SpaceBetween gap={4} direction="horizontal">
              <Text style={{ color: theme.pageTextSubdued }}>
                <Trans>Amount:</Trans>
              </Text>
              <Text style={{ ...styles.tnum, color: theme.pageText }}>
                {amountStr}
              </Text>
            </SpaceBetween>
            {schedule.next_date && (
              <SpaceBetween gap={4} direction="horizontal">
                <Text style={{ color: theme.pageTextSubdued }}>
                  <Trans>Next:</Trans>
                </Text>
                <Text style={{ color: theme.pageText }}>
                  {monthUtilFormat(schedule.next_date, dateFormat)}
                </Text>
              </SpaceBetween>
            )}
          </SpaceBetween>
        </View>

        {/* Status badge */}
        <View style={{ flexShrink: 0, paddingTop: 2 }}>
          <StatusBadge status={status} />
        </View>
      </SpaceBetween>
    </ActionableGridListItem>
  );
}
