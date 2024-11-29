import { type ReactNode, useState } from 'react';

import { css, cx } from '@emotion/css';

import { SvgCalendar } from '../../icons/v1';
import { SvgTable } from '../../icons/v2/Table';
import { theme } from '../../style';
import { View } from '../common/View';

type ScheduleViewSelectorProps = {
  tableComponent: ReactNode;
  calendarComponent: ReactNode;
};

export function ScheduleViewSelector({
  tableComponent,
  calendarComponent,
}: ScheduleViewSelectorProps) {
  const [selectedTab, setSelectedTab] = useState(0);
  const unselectedStyle = css({
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.tableRowBackgroundHover,
    },
  });

  const selectedStyle = css({
    backgroundColor: theme.tableHeaderBackground,
    boxShadow:
      'inset 1px 1px 1px rgba(255,255,255,0.2), inset -1px -1px 1px rgba(0,0,0,0.05)',
  });

  return (
    <>
      <View
        className={css({
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          marginBottom: 8,
          gap: 1,
          borderRadius: 6,
          backgroundColor: theme.cardBackground,
          width: '200px',
        })}
      >
        <View
          className={cx(
            css({
              flexDirection: 'row',
              gap: 2,
              justifyContent: 'center',
              padding: 8,
              borderTopLeftRadius: 4,
              borderBottomLeftRadius: 4,
            }),
            selectedTab === 0 ? selectedStyle : unselectedStyle,
          )}
          onClick={() => setSelectedTab(0)}
        >
          <SvgTable width={16} height={16} /> Table
        </View>
        <View
          className={cx(
            css({
              flexDirection: 'row',
              gap: 2,
              justifyContent: 'center',
              padding: 8,
              borderTopRightRadius: 4,
              borderBottomRightRadius: 4,
              cursor: 'pointer',
            }),
            selectedTab === 1 ? selectedStyle : unselectedStyle,
          )}
          onClick={() => setSelectedTab(1)}
        >
          <SvgCalendar width={16} height={16} /> Calendar
        </View>
      </View>
      {selectedTab === 0 && tableComponent}
      {selectedTab === 1 && calendarComponent}
    </>
  );
}
