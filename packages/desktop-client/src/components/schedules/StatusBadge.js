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
  let color, backgroundColor, Icon;

  switch (status) {
    case 'missed':
      color = colorsm.errorText;
      backgroundColor = colorsm.errorBackground;
      Icon = EditSkull1;
      break;
    case 'due':
      color = colorsm.warningText;
      backgroundColor = colorsm.warningBackground;
      Icon = AlertTriangle;
      break;
    case 'upcoming':
      color = colorsm.formInputTextHighlight;
      backgroundColor = colorsm.formInputBackground;
      Icon = CalendarIcon;
      break;
    case 'paid':
      color = colorsm.noticeText;
      backgroundColor = colorsm.noticeBackground;
      Icon = ValidationCheck;
      break;
    case 'completed':
      color = colorsm.tableText;
      backgroundColor = colorsm.tableBackground;
      Icon = FavoriteStar;
      break;
    case 'pending':
      color = colorsm.noticeText;
      backgroundColor = colorsm.noticeBackground;
      Icon = CalendarIcon;
      break;
    case 'scheduled':
      color = colorsm.tableText;
      backgroundColor = colorsm.tableBackground;
      Icon = CalendarIcon;
      break;
    case 'cleared':
      color = colorsm.noticeText;
      backgroundColor = colorsm.noticeBackground;
      Icon = CheckCircle1;
      break;
    default:
      color = colorsm.buttonDisabledText;
      backgroundColor = colorsm.buttonDisabledBackground;
      Icon = CheckCircleHollow;
      break;
  }

  return { color, backgroundColor, Icon };
}

export function StatusBadge({ status, style }) {
  let { color, backgroundColor, Icon } = getStatusProps(status);
  return (
    <View
      style={[
        {
          color,
          backgroundColor,
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
