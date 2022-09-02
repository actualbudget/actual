import React from 'react';

import * as d from 'date-fns';

import { Block } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

function DateRange({ start, end }) {
  start = d.parseISO(start);
  end = d.parseISO(end);

  let content;
  if (start.getYear() !== end.getYear()) {
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

  return <Block style={{ color: colors.n6 }}>{content}</Block>;
}

export default DateRange;
