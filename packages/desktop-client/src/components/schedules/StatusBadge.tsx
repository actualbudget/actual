import React from 'react';

import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { type ScheduleStatusType } from 'loot-core/client/data-hooks/schedules';
import { titleFirst } from 'loot-core/shared/util';

import {
  SvgAlertTriangle,
  SvgCalendar3,
  SvgCheckCircle1,
  SvgCheckCircleHollow,
  SvgEditSkull1,
  SvgFavoriteStar,
  SvgLockClosed,
  SvgValidationCheck,
} from '../../icons/v2';
import { theme } from '../../style';

// Consists of Schedule Statuses + Transaction statuses
type StatusTypes = ScheduleStatusType | 'cleared' | 'pending' | 'reconciled';
export function getStatusProps(status: StatusTypes) {
  switch (status) {
    case 'missed':
      return {
        color: theme.errorTextDarker,
        backgroundColor: theme.errorBackground,
        Icon: SvgEditSkull1,
      };
    case 'due':
      return {
        color: theme.warningTextDark,
        backgroundColor: theme.warningBackground,
        Icon: SvgAlertTriangle,
      };
    case 'upcoming':
      return {
        color: theme.upcomingText,
        backgroundColor: theme.upcomingBackground,
        Icon: SvgCalendar3,
      };
    case 'paid':
      return {
        color: theme.noticeText,
        backgroundColor: theme.noticeBackgroundLight,
        Icon: SvgValidationCheck,
      };
    case 'completed':
      return {
        color: theme.tableHeaderText,
        backgroundColor: theme.tableRowHeaderBackground,
        Icon: SvgFavoriteStar,
      };
    case 'pending':
      return {
        color: theme.noticeTextLight,
        backgroundColor: theme.noticeBackgroundLight,
        Icon: SvgCalendar3,
      };
    case 'scheduled':
      return {
        color: theme.tableRowHeaderText,
        backgroundColor: theme.tableRowHeaderBackground,
        Icon: SvgCalendar3,
      };
    case 'cleared':
      return {
        color: theme.noticeTextLight,
        backgroundColor: theme.tableRowHeaderBackground,
        Icon: SvgCheckCircle1,
      };
    case 'reconciled':
      return {
        color: theme.noticeTextLight,
        backgroundColor: theme.tableRowHeaderBackground,
        Icon: SvgLockClosed,
      };
    default:
      return {
        color: theme.buttonNormalDisabledText,
        backgroundColor: theme.tableRowHeaderBackground,
        Icon: SvgCheckCircleHollow,
      };
  }
}

export function StatusBadge({ status }: { status: ScheduleStatusType }) {
  const { color, backgroundColor, Icon } = getStatusProps(status);
  return (
    <View
      style={{
        color,
        backgroundColor,
        padding: '6px 8px',
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      <Icon
        style={{
          width: 13,
          height: 13,
          marginRight: 7,
        }}
      />
      <Text style={{ lineHeight: '1em' }}>{titleFirst(status)}</Text>
    </View>
  );
}
