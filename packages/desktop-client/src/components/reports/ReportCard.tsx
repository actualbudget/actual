import React, { type ReactNode } from 'react';

import { type CustomReportEntity } from 'loot-core/src/types/models';

import { useResponsive } from '../../ResponsiveProvider';
import { type CSSProperties, theme } from '../../style';
import { Link } from '../common/Link';
import { View } from '../common/View';

const DRAG_HANDLE_HEIGHT = 5;

type ReportCardProps = {
  to: string;
  children: ReactNode;
  report?: CustomReportEntity;
  size?: number;
  style?: CSSProperties;
};

export function ReportCard({
  to,
  report,
  children,
  size = 1,
  style,
}: ReportCardProps) {
  const { isNarrowWidth } = useResponsive();
  const containerProps = {
    flex: isNarrowWidth ? '1 1' : `0 0 calc(${size * 100}% / 3 - 20px)`,
  };

  const content = (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        height: `calc(100% - ${DRAG_HANDLE_HEIGHT}px)`,
        boxShadow: '0 2px 6px rgba(0, 0, 0, .15)',
        transition: 'box-shadow .25s',
        '& .recharts-surface:hover': {
          cursor: 'pointer',
        },
        ':hover': to && {
          boxShadow: '0 4px 6px rgba(0, 0, 0, .15)',
        },
        ...(to ? null : containerProps),
        ...style,
      }}
    >
      {children}
    </View>
  );

  if (to) {
    return (
      <>
        <View
          className="draggable-handle"
          style={{
            borderTopLeftRadius: 2,
            borderTopRightRadius: 2,
            height: DRAG_HANDLE_HEIGHT,
            backgroundColor: 'rgba(0, 0, 0, .15)',
            ':hover': {
              cursor: 'grab',
            },
          }}
        />

        <Link
          to={to}
          report={report}
          style={{ textDecoration: 'none', ...containerProps }}
        >
          {content}
        </Link>
      </>
    );
  }
  return content;
}
