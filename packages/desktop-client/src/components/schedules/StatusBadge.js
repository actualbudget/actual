import React from 'react';

import { titleFirst } from 'loot-core/src/shared/util';

import AlertTriangle from '../../icons/v2/AlertTriangle';
import CalendarIcon from '../../icons/v2/Calendar';
import CheckCircle1 from '../../icons/v2/CheckCircle1';
import CheckCircleHollow from '../../icons/v2/CheckCircleHollow';
import EditSkull1 from '../../icons/v2/EditSkull1';
import FavoriteStar from '../../icons/v2/FavoriteStar';
import ValidationCheck from '../../icons/v2/ValidationCheck';
import { colors } from '../../style';
import { View, Text } from '../common';

export function getStatusProps(status) {
  let color, backgroundColor, borderColor, Icon;

  switch (status) {
    case 'missed':
      color = colors.errorText;
      backgroundColor = colors.errorBackground;
      borderColor = colors.errorAccent;
      Icon = EditSkull1;
      break;
    case 'due':
      color = colors.warningText;
      backgroundColor = colors.warningBackground;
      borderColor = colors.warningAccent;
      Icon = AlertTriangle;
      break;
    case 'upcoming':
      color = colors.tableTextInactive;
      backgroundColor = colors.tableBackground;
      borderColor = colors.tableBorder;
      Icon = CalendarIcon;
      break;
    case 'paid':
      color = colors.noticeText;
      backgroundColor = colors.noticeBackground;
      borderColor = colors.noticeAccent;
      Icon = ValidationCheck;
      break;
    case 'completed':
      color = colors.tableText;
      backgroundColor = colors.tableBackground;
      borderColor = colors.tableBorder;
      Icon = FavoriteStar;
      break;
    case 'pending':
      color = colors.noticeText;
      backgroundColor = colors.noticeBackground;
      borderColor = colors.noticeAccent;
      Icon = CalendarIcon;
      break;
    case 'scheduled':
      color = colors.tableText;
      backgroundColor = colors.tableBackground;
      borderColor = colors.tableBorder;
      Icon = CalendarIcon;
      break;
    case 'cleared':
      color = colors.noticeText;
      backgroundColor = colors.noticeBackground;
      borderColor = colors.noticeAccent;
      Icon = CheckCircle1;
      break;
    default:
      color = colors.buttonDisabledText;
      backgroundColor = colors.buttonDisabledBackground;
      borderColor = colors.buttonDisabledBorder;
      Icon = CheckCircleHollow;
      break;
  }

  return { color, backgroundColor, borderColor, Icon };
}

export function StatusBadge({ status, style }) {
  let { color, backgroundColor, borderColor, Icon } = getStatusProps(status);
  return (
    <View
      style={[
        {
          color,
          backgroundColor,
          border: '1px solid ' + borderColor,
          padding: '6px 8px',
          borderRadius: 4,
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 0,
        },
        style,
      ]}
    >
      <Icon
        style={{
          width: 13,
          height: 13,
          color: 'inherit',
          marginRight: 7,
        }}
      />
      <Text style={{ lineHeight: '1em' }}>{titleFirst(status)}</Text>
    </View>
  );
}
