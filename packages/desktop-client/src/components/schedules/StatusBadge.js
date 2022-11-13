import React from 'react';

import { titleFirst } from 'loot-core/src/shared/util';
import { View, Text } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';
import AlertTriangle from 'loot-design/src/svg/v2/AlertTriangle';
import CalendarIcon from 'loot-design/src/svg/v2/Calendar';
import CheckCircle1 from 'loot-design/src/svg/v2/CheckCircle1';
import CheckCircleHollow from 'loot-design/src/svg/v2/CheckCircleHollow';
import EditSkull1 from 'loot-design/src/svg/v2/EditSkull1';
import FavoriteStar from 'loot-design/src/svg/v2/FavoriteStar';
import ValidationCheck from 'loot-design/src/svg/v2/ValidationCheck';

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
  let { color } = getStatusProps(status);

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
          flexShrink: 0
        },
        style
      ]}
    >
      <Icon
        style={{
          width: 13,
          height: 13,
          color: 'inherit',
          marginRight: 7
        }}
      />
      <Text style={{ lineHeight: '1em' }}>{titleFirst(status)}</Text>
    </View>
  );
}
