import React, {type ReactElement} from 'react';

import * as d from 'date-fns';

import { theme } from '../../style';
import Block from '../common/Block';

type DateRangeProps = {
  start: string;
  end: string;
};

function DateRange({ start, end }: DateRangeProps): ReactElement {
  const parseStart = d.parseISO(start);
  const parseEnd = d.parseISO(end);

  let content: string | ReactElement;
  if (parseStart.getFullYear() !== parseEnd.getFullYear()) {
    content = (
      <div>
        `${d.format(parseStart, 'MMM yyyy')} - ${d.format(parseEnd, 'MMM yyyy')}
        `
      </div>
    );
  } else if (parseStart.getMonth() !== parseEnd.getMonth()) {
    content = (
      <div>
        {d.format(parseStart, 'MMM')} - {d.format(parseEnd, 'MMM yyyy')}
      </div>
    );
  } else {
    content = d.format(parseEnd, 'MMMM yyyy');
  }

  return <Block style={{ color: theme.pageTextSubdued }}>{content}</Block>;
}

export default DateRange;
