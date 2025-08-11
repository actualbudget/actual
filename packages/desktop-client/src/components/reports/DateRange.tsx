import React, { type ReactElement } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import * as d from 'date-fns';

import * as monthUtils from 'loot-core/shared/months';

import { useLocale } from '@desktop-client/hooks/useLocale';

type DateRangeProps = {
  start: string;
  end: string;
  type?: string;
};

function checkDate(date: string) {
  const dateParsed = monthUtils.parseDate(date);
  if (dateParsed) {
    return d.format(dateParsed, 'yyyy-MM-dd');
  } else {
    return null;
  }
}

export function DateRange({ start, end, type }: DateRangeProps): ReactElement {
  const { t } = useTranslation();
  const locale = useLocale();
  const checkStart = checkDate(start);
  const checkEnd = checkDate(end);

  let startDate;
  let endDate;
  if (checkStart && checkEnd) {
    startDate = d.parseISO(checkStart);
    endDate = d.parseISO(checkEnd);
  } else {
    return (
      <Text style={{ ...styles.mediumText, color: theme.errorText }}>
        <Trans>There was a problem loading your date range</Trans>
      </Text>
    );
  }

  const formattedStartDate = d.format(startDate, 'MMM yyyy', { locale });
  const formattedEndDate = d.format(endDate, 'MMM yyyy', { locale });
  let typeOrFormattedEndDate: string;

  if (type && ['budget', 'average'].includes(type)) {
    typeOrFormattedEndDate = type === 'budget' ? t('budgeted') : t('average');
  } else {
    typeOrFormattedEndDate = formattedEndDate;
  }

  let content: string | ReactElement;
  if (['budget', 'average'].includes(type || '')) {
    content = (
      <div>
        <Trans>
          Compare {{ formattedStartDate }} to {{ typeOrFormattedEndDate }}
        </Trans>
      </div>
    );
  } else if (
    startDate.getFullYear() !== endDate.getFullYear() ||
    startDate.getMonth() !== endDate.getMonth()
  ) {
    content = (
      <div>
        {type ? (
          <Trans>
            Compare {{ formattedStartDate }} to {{ typeOrFormattedEndDate }}
          </Trans>
        ) : (
          <>
            {formattedStartDate} - {formattedEndDate}
          </>
        )}
      </div>
    );
  } else {
    content = d.format(endDate, 'MMMM yyyy', { locale });
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}
