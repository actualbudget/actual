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
import { theme, type CSSProperties, colors } from '../../style';
import Text from '../common/Text';
import View from '../common/View';

// Consists of Schedule Statuses + Transaction statuses
type StatusTypes = ScheduleStatusType | 'cleared' | 'pending';
export function getStatusProps(status: StatusTypes) {
  switch (status) {
    case 'missed':
      return {
        color: colors.r1,
        backgroundColor: colors.r10,
        Icon: EditSkull1,
      };
    case 'due':
      return {
        color: colors.y1,
        backgroundColor: colors.y9,
        Icon: AlertTriangle,
      };
    case 'upcoming':
      return {
        color: colors.p1,
        backgroundColor: colors.p10,
        Icon: CalendarIcon,
      };
    case 'paid':
      return {
        color: colors.g2,
        backgroundColor: colors.g10,
        Icon: ValidationCheck,
      };
    case 'completed':
      return {
        color: colors.n4,
        backgroundColor: colors.n11,
        Icon: FavoriteStar,
      };
    // @todo: Check if 'pending' is still a valid status in Transaction
    case 'pending':
      return {
        color: colors.g4,
        backgroundColor: colors.g11,
        Icon: CalendarIcon,
      };
    case 'scheduled':
      return {
        color: colors.n1,
        backgroundColor: colors.n11,
        Icon: CalendarIcon,
      };
    case 'cleared':
      return {
        color: colors.g5,
        backgroundColor: colors.n11,
        Icon: CheckCircle1,
      };
    default:
      return {
        color: colors.n7,
        backgroundColor: colors.n11,
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
