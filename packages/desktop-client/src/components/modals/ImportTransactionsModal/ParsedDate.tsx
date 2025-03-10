import React from 'react';
import { Trans } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';

import { formatDate, parseDate } from './utils';

type ParsedDateProps = {
  parseDateFormat?: Parameters<typeof parseDate>[1];
  dateFormat: Parameters<typeof parseDate>[1];
  date?: string;
};

export function ParsedDate({
  parseDateFormat,
  dateFormat,
  date,
}: ParsedDateProps) {
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
            <Trans>Empty</Trans>
          </Text>
        )}{' '}
        &rarr;{' '}
      </Text>
      <Text style={{ color: parsed ? theme.noticeTextLight : theme.errorText }}>
        {parsed || <Trans>Invalid</Trans>}
      </Text>
    </Text>
  );
}
