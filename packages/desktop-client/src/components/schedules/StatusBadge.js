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
  let color, backgroundColor, Icon;

  switch (status) {
    case 'missed':
      color = colors.r1;
      backgroundColor = colors.r10;
      Icon = EditSkull1;
      break;
    case 'due':
      color = colors.y1;
      backgroundColor = colors.y9;
      Icon = AlertTriangle;
      break;
    case 'upcoming':
      color = colors.p1;
      backgroundColor = colors.p10;
      Icon = CalendarIcon;
      break;
    case 'paid':
      color = colors.g2;
      backgroundColor = colors.g10;
      Icon = ValidationCheck;
      break;
    case 'completed':
      color = colors.n4;
      backgroundColor = colors.n11;
      Icon = FavoriteStar;
      break;
    case 'pending':
      color = colors.g4;
      backgroundColor = colors.g11;
      Icon = CalendarIcon;
      break;
    case 'scheduled':
      color = colors.n1;
      backgroundColor = colors.n11;
      Icon = CalendarIcon;
      break;
    case 'cleared':
      color = colors.g5;
      backgroundColor = colors.n11;
      Icon = CheckCircle1;
      break;
    default:
      color = colors.n1;
      backgroundColor = colors.n11;
      Icon = CheckCircleHollow;
      break;
  }

  return { color, backgroundColor, Icon };
}

export function StatusIcon({ status }) {
  let { color, Icon } = getStatusProps(status);

  return <Icon style={{ width: 13, height: 13, color }} />;
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
