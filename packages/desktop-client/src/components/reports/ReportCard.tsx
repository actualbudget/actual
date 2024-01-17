// @ts-strict-ignore
import React from 'react';

import { type CSSProperties, theme } from '../../style';
import { AnchorLink } from '../common/AnchorLink';
import { View } from '../common/View';

type ReportCardProps = {
  to: string;
  report: any;
  children: any;
  flex?: any;
  style?: any;
};

export function ReportCard({
  flex,
  to,
  style,
  report,
  children,
}: ReportCardProps) {
  const containerProps = { flex, margin: 15 };

  const content = (
    <View
      style={{
        backgroundColor: theme.tableBackground,
        borderRadius: 2,
        height: 200,
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
      <AnchorLink
        to={to}
        style={{ textDecoration: 'none', flex, ...containerProps }}
        report={report}
      >
        {content}
      </AnchorLink>
    );
  }
  return content;
}
