import React from 'react';

import { type ScheduleStatusType } from 'loot-core/src/client/data-hooks/schedules';
import { titleFirst } from 'loot-core/src/shared/util';

import AlertTriangle from '../../icons/v2/AlertTriangle';
import CalendarIcon from '../../icons/v2/Calendar';
import CheckCircle1 from '../../icons/v2/CheckCircle1';
import Lock from '../../icons/v2/Lock';
import CheckCircleHollow from '../../icons/v2/CheckCircleHollow';
import EditSkull1 from '../../icons/v2/EditSkull1';
import FavoriteStar from '../../icons/v2/FavoriteStar';
import ValidationCheck from '../../icons/v2/ValidationCheck';
import { theme } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

// Consists of Schedule Statuses + Transaction statuses
type StatusTypes = ScheduleStatusType | 'cleared' | 'pending';
export function getStatusProps(status: StatusTypes) {
  switch (status) {
    case 'missed':
      return {
        color: theme.altErrorText,
        backgroundColor: theme.altErrorBackground,
        Icon: EditSkull1,
      };
    case 'due':
      return {
        color: theme.altWarningText,
        backgroundColor: theme.altWarningBackground,
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
        color: theme.alt2NoticeText,
        backgroundColor: theme.altNoticeBackground,
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
        color: theme.alt3NoticeText,
        backgroundColor: theme.alt2NoticeBackground,
        Icon: CalendarIcon,
      };
    case 'scheduled':
      return {
        color: theme.menuItemText,
        backgroundColor: theme.altTableBackground,
        Icon: CalendarIcon,
      };
    case 'cleared':
      color = theme.noticeText;
      backgroundColor = theme.altTableBackground;
      Icon = CheckCircle1;
      break;
    case 'reconciled':
      color = theme.noticeText;
      backgroundColor = theme.altTableBackground;
      Icon = Lock;
      break;
    default:
      return {
        color: theme.buttonNormalDisabledText,
        backgroundColor: theme.altTableBackground,
        Icon: CheckCircleHollow,
      };
  }
}

type Status =
  | 'missed'
  | 'due'
  | 'upcoming'
  | 'paid'
  | 'completed'
  | 'pending'
  | 'scheduled'
  | 'cleared'
  | 'reconciled';

type StatusBadgeProps = {
  status: Status;
  style?: CSSProperties;
};

export function StatusBadge({ status, style }: StatusBadgeProps) {
  let { color, backgroundColor, Icon } = getStatusProps(status);
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
