import React from 'react';

import { type ScheduleStatusType } from 'loot-core/src/client/data-hooks/schedules';
import { titleFirst } from 'loot-core/src/shared/util';

import AlertTriangle from '../../icons/v2/AlertTriangle';
import CalendarIcon from '../../icons/v2/Calendar';
import CheckCircle1 from '../../icons/v2/CheckCircle1';
import CheckCircleHollow from '../../icons/v2/CheckCircleHollow';
import EditSkull1 from '../../icons/v2/EditSkull1';
import FavoriteStar from '../../icons/v2/FavoriteStar';
import Lock from '../../icons/v2/LockClosed';
import ValidationCheck from '../../icons/v2/ValidationCheck';
import { theme } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

// Consists of Schedule Statuses + Transaction statuses
type StatusTypes = ScheduleStatusType | 'cleared' | 'pending' | 'reconciled';
export function getStatusProps(status: StatusTypes) {
  switch (status) {
    case 'missed':
      return {
        color: theme.errorTextDarker,
        backgroundColor: theme.errorBackground,
        Icon: EditSkull1,
      };
    case 'due':
      return {
        color: theme.warningTextDark,
        backgroundColor: theme.warningBackground,
        Icon: AlertTriangle,
      };
    case 'upcoming':
      return {
        color: theme.upcomingText,
        backgroundColor: theme.upcomingBackground,
        Icon: CalendarIcon,
      };
    case 'paid':
      return {
        color: theme.noticeText,
        backgroundColor: theme.noticeBackgroundLight,
        Icon: ValidationCheck,
      };
    case 'completed':
      return {
        color: theme.alt2TableText,
        backgroundColor: theme.altTableBackground,
        Icon: FavoriteStar,
      };
    case 'pending':
      return {
        color: theme.noticeTextLight,
        backgroundColor: theme.noticeBackgroundLight,
        Icon: CalendarIcon,
      };
    case 'scheduled':
      return {
        color: theme.menuItemText,
        backgroundColor: theme.altTableBackground,
        Icon: CalendarIcon,
      };
    case 'cleared':
      return {
        color: theme.noticeTextLight,
        backgroundColor: theme.altTableBackground,
        Icon: CheckCircle1,
      };
    case 'reconciled':
      return {
        color: theme.noticeTextLight,
        backgroundColor: theme.altTableBackground,
        Icon: Lock,
      };
    default:
      return {
        color: theme.buttonNormalDisabledText,
        backgroundColor: theme.altTableBackground,
        Icon: CheckCircleHollow,
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
