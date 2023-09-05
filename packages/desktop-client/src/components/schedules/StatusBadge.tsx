import React from 'react';

import { type ScheduleStatusType } from 'loot-core/src/client/data-hooks/schedules';
import { titleFirst } from 'loot-core/src/shared/util';

import AlertTriangle from '../../icons/v2/AlertTriangle';
import CalendarIcon from '../../icons/v2/Calendar';
import CheckCircle1 from '../../icons/v2/CheckCircle1';
import CheckCircleHollow from '../../icons/v2/CheckCircleHollow';
import EditSkull1 from '../../icons/v2/EditSkull1';
import FavoriteStar from '../../icons/v2/FavoriteStar';
import ValidationCheck from '../../icons/v2/ValidationCheck';
import { theme, type CSSProperties } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

export function getStatusProps(status: ScheduleStatusType) {
  let color, backgroundColor, Icon;

  switch (status) {
    case 'missed':
      color = theme.altErrorText;
      backgroundColor = theme.altErrorBackground;
      Icon = EditSkull1;
      break;
    case 'due':
      color = theme.altWarningText;
      backgroundColor = theme.altWarningBackground;
      Icon = AlertTriangle;
      break;
    case 'upcoming':
      color = theme.upcomingText;
      backgroundColor = theme.upcomingBackground;
      Icon = CalendarIcon;
      break;
    case 'paid':
      color = theme.alt2NoticeText;
      backgroundColor = theme.altNoticeBackground;
      Icon = ValidationCheck;
      break;
    case 'completed':
      color = theme.alt2TableText;
      backgroundColor = theme.altTableBackground;
      Icon = FavoriteStar;
      break;
    case 'pending':
      color = theme.alt3NoticeText;
      backgroundColor = theme.alt2NoticeBackground;
      Icon = CalendarIcon;
      break;
    case 'scheduled':
      color = theme.menuItemText;
      backgroundColor = theme.altTableBackground;
      Icon = CalendarIcon;
      break;
    case 'cleared':
      color = theme.noticeText;
      backgroundColor = theme.altTableBackground;
      Icon = CheckCircle1;
      break;
    default:
      color = theme.buttonNormalDisabledText;
      backgroundColor = theme.altTableBackground;
      Icon = CheckCircleHollow;
      break;
  }

  return { color, backgroundColor, Icon };
}

export function StatusBadge({ status }) {
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
