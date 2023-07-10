import React from 'react';

import { titleFirst } from 'loot-core/src/shared/util';

import AlertTriangle from '../../icons/v2/AlertTriangle';
import CalendarIcon from '../../icons/v2/Calendar';
import CheckCircle1 from '../../icons/v2/CheckCircle1';
import CheckCircleHollow from '../../icons/v2/CheckCircleHollow';
import EditSkull1 from '../../icons/v2/EditSkull1';
import FavoriteStar from '../../icons/v2/FavoriteStar';
import ValidationCheck from '../../icons/v2/ValidationCheck';
import { colorsm } from '../../style';
import { View, Text } from '../common';

export function getStatusProps(status) {
  let color, backgroundColor, borderColor, Icon;

  switch (status) {
    case 'missed':
      color = colorsm.errorText;
      backgroundColor = colorsm.errorBackground;
      borderColor = colorsm.errorAccent;
      Icon = EditSkull1;
      break;
    case 'due':
      color = colorsm.warningText;
      backgroundColor = colorsm.warningBackground;
      borderColor = colorsm.warningAccent;
      Icon = AlertTriangle;
      break;
    case 'upcoming':
      color = colorsm.tableTextInactive;
      backgroundColor = colorsm.tableBackground;
      borderColor = colorsm.tableBorder;
      Icon = CalendarIcon;
      break;
    case 'paid':
      color = colorsm.noticeText;
      backgroundColor = colorsm.noticeBackground;
      borderColor = colorsm.noticeAccent;
      Icon = ValidationCheck;
      break;
    case 'completed':
      color = colorsm.tableText;
      backgroundColor = colorsm.tableBackground;
      borderColor = colorsm.tableBorder;
      Icon = FavoriteStar;
      break;
    case 'pending':
      color = colorsm.noticeText;
      backgroundColor = colorsm.noticeBackground;
      borderColor = colorsm.noticeAccent;
      Icon = CalendarIcon;
      break;
    case 'scheduled':
      color = colorsm.tableText;
      backgroundColor = colorsm.tableBackground;
      borderColor = colorsm.tableBorder;
      Icon = CalendarIcon;
      break;
    case 'cleared':
      color = colorsm.noticeText;
      backgroundColor = colorsm.noticeBackground;
      borderColor = colorsm.noticeAccent;
      Icon = CheckCircle1;
      break;
    default:
      color = colorsm.buttonDisabledText;
      backgroundColor = colorsm.buttonDisabledBackground;
      borderColor = colorsm.buttonDisabledBorder;
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
