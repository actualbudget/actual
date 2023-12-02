import React from 'react';

import * as d from 'date-fns';

import Block from '../common/Block';
import { theme } from '../../style';

type DateRangeProps = {
  start: string;
  end: string;
}

function DateRange({ start, end }: DateRangeProps): JSX.Element {
  const parseStart  = d.parseISO(start);
  const parsedEnd = d.parseISO(end);

  let content: string | React.ReactElement;
  if (parseStart.getFullYear() !== parsedEnd.getFullYear()) {
    content = ( 
      <div>
        `${d.format(parseStart, 'MMM yyyy')} - ${d.format(parsedEnd, 'MMM yyyy')}`
      </div>
    );
  } else if (parseStart.getMonth() !== parsedEnd.getMonth()) {
    content = (
      <div>
        {d.format(parseStart, 'MMM')} - {d.format(parsedEnd, 'MMM yyyy')}
      </div>
    );
  } else {
    content = d.format(parsedEnd, 'MMMM yyyy');
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}

export default DateRange;
