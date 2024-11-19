import React, { type ReactElement } from 'react';
import { Trans } from 'react-i18next';

import * as d from 'date-fns';

import * as monthUtils from 'loot-core/src/shared/months';

import { theme } from '../../style';
import { styles } from '../../style/styles';
import { Block } from '../common/Block';
import { Text } from '../common/Text';

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

  const formattedStartDate = d.format(startDate, 'MMM yyyy');
  const formattedEndDate = d.format(endDate, 'MMM yyyy');
  let typeOrFormattedEndDate: string;

  if (type && ['budget', 'average'].includes(type)) {
    typeOrFormattedEndDate = type === 'budget' ? 'budgeted' : type;
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
          <Trans>
            {{ formattedStartDate }} - {{ formattedEndDate }}
          </Trans>
        )}
      </div>
    );
  } else {
    content = d.format(endDate, 'MMMM yyyy');
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}
