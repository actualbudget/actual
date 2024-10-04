import React from 'react';

import { theme } from '../../../style';
import { Text } from '../../common/Text';

import { formatDate, parseDate } from './utils';

export function ParsedDate({ parseDateFormat, dateFormat, date }) {
  const parsed =
    date &&
    formatDate(
      parseDateFormat ? parseDate(date, parseDateFormat) : date,
      dateFormat,
    );
  return (
    <Text>
      <Text>
        {date || (
          <Text style={{ color: theme.pageTextLight, fontStyle: 'italic' }}>
            Empty
          </Text>
        )}{' '}
        &rarr;{' '}
      </Text>
      <Text style={{ color: parsed ? theme.noticeTextLight : theme.errorText }}>
        {parsed || 'Invalid'}
      </Text>
    </Text>
  );
}
