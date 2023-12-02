import React, { type ReactElement } from 'react';

import * as d from 'date-fns';

import { theme } from '../../style';
import Block from '../common/Block';

type DateRangeProps = {
  start: string | Date;
  end: string | Date;
};

function DateRange({ start, end }: DateRangeProps): ReactElement {
  start = d.parseISO(start as string);
  end = d.parseISO(end as string);

  let content: string | ReactElement;
  if (start.getFullYear() !== end.getFullYear()) {
    content = (
      <div>
        {d.format(start, 'MMM yyyy')} - {d.format(end, 'MMM yyyy')}
      </div>
    );
  } else if (start.getMonth() !== end.getMonth()) {
    content = (
      <div>
        {d.format(start, 'MMM')} - {d.format(end, 'MMM yyyy')}
      </div>
    );
  } else {
    content = d.format(end, 'MMMM yyyy');
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}

export default DateRange;
