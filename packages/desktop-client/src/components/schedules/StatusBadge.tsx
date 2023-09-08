import React from 'react';

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

export function getStatusProps(status: Status) {
  let color, backgroundColor, Icon;

  switch (status) {
    case 'missed':
      color = theme.errorText;
      backgroundColor = theme.errorBackground;
      borderColor = theme.errorAccent;
      Icon = EditSkull1;
      break;
    case 'due':
      color = theme.warningText;
      backgroundColor = theme.warningBackground;
      borderColor = theme.warningAccent;
      Icon = AlertTriangle;
      break;
    case 'upcoming':
      color = theme.upcomingText;
      backgroundColor = theme.upcomingBackground;
      borderColor = theme.upcomingAccent;
      Icon = CalendarIcon;
      break;
    case 'paid':
      color = theme.noticeText;
      backgroundColor = theme.noticeBackground;
      borderColor = theme.noticeAccent;
      Icon = ValidationCheck;
      break;
    case 'completed':
      color = theme.tableText;
      backgroundColor = theme.tableBackground;
      borderColor = theme.tableBorder;
      Icon = FavoriteStar;
      break;
    case 'pending':
      color = theme.noticeText;
      backgroundColor = theme.noticeBackground;
      borderColor = theme.noticeAccent;
      Icon = CalendarIcon;
      break;
    case 'scheduled':
      color = theme.tableText;
      backgroundColor = theme.tableBackground;
      borderColor = theme.tableBorder;
      Icon = CalendarIcon;
      break;
    case 'cleared':
      color = theme.noticeText;
      backgroundColor = theme.noticeBackground;
      borderColor = theme.noticeAccent;
      Icon = CheckCircle1;
      break;
    default:
      color = theme.buttonDisabledText;
      backgroundColor = theme.buttonDisabledBackground;
      borderColor = theme.buttonDisabledBorder;
      Icon = CheckCircleHollow;
      break;
  }

  return { color, backgroundColor, borderColor, Icon };
}

type Status =
  | 'missed'
  | 'due'
  | 'upcoming'
  | 'paid'
  | 'completed'
  | 'pending'
  | 'scheduled'
  | 'cleared';

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
        ...style,
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
