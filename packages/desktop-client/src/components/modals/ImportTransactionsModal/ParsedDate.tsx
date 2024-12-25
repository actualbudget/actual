import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { theme } from '../../../style';
import { Text } from '../../common/Text';

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
  const { t } = useTranslation();

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
        {parsed || t('Invalid')}
      </Text>
    </Text>
  );
}
