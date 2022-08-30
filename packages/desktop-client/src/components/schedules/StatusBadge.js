import React from 'react';
import { colors } from 'loot-design/src/style';
import { View, Text } from 'loot-design/src/components/common';
import { titleFirst } from 'loot-core/src/shared/util';

import EditSkull1 from 'loot-design/src/svg/v2/EditSkull1';
import AlertTriangle from 'loot-design/src/svg/v2/AlertTriangle';
import CalendarIcon from 'loot-design/src/svg/v2/Calendar';
import ValidationCheck from 'loot-design/src/svg/v2/ValidationCheck';
import FavoriteStar from 'loot-design/src/svg/v2/FavoriteStar';
import CheckCircle1 from 'loot-design/src/svg/v2/CheckCircle1';
import { useTranslation } from 'react-i18next';

export function getStatusProps(status) {
  let color, backgroundColor, Icon, title;

  const { t } = useTranslation();

  switch (status) {
    case 'missed':
      color = colors.r1;
      backgroundColor = colors.r10;
      Icon = EditSkull1;
      title = t('status.missed');
      break;
    case 'due':
      color = colors.y1;
      backgroundColor = colors.y9;
      Icon = AlertTriangle;
      title = t('status.due');
      break;
    case 'upcoming':
      color = colors.p1;
      backgroundColor = colors.p10;
      Icon = CalendarIcon;
      title = t('status.upcoming');
      break;
    case 'paid':
      color = colors.g2;
      backgroundColor = colors.g10;
      Icon = ValidationCheck;
      title = t('status.paid');
      break;
    case 'completed':
      color = colors.n4;
      backgroundColor = colors.n11;
      Icon = FavoriteStar;
      title = t('status.completed');
      break;
    case 'pending':
      color = colors.g4;
      backgroundColor = colors.g11;
      Icon = CalendarIcon;
      title = t('status.pending');
      break;
    case 'scheduled':
      color = colors.n1;
      backgroundColor = colors.n11;
      Icon = CalendarIcon;
      title = t('status.scheduled');
      break;
    default:
      color = colors.n1;
      backgroundColor = colors.n11;
      Icon = CheckCircle1;
      title = status;
      break;
  }

  return { title, color, backgroundColor, Icon };
}

export function StatusIcon({ status }) {
  let { color } = getStatusProps(status);

  return <Icon style={{ width: 13, height: 13, color }} />;
}

export function StatusBadge({ status, style }) {
  let { title, color, backgroundColor, Icon } = getStatusProps(status);
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
      <Text style={{ lineHeight: '1em' }}>{titleFirst(title)}</Text>
    </View>
  );
}
