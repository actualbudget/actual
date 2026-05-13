import React from 'react';

import { Card } from '@actual-app/components/card';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css, keyframes } from '@emotion/css';

import { getColumnWidth, ROW_HEIGHT } from './BudgetTable';

const pulse = keyframes({
  '0%, 100%': { opacity: 0.5 },
  '50%': { opacity: 0.9 },
});

const pulseClass = css({
  animationName: pulse,
  animationDuration: '1.4s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
});

type BarProps = {
  width: number | string;
};

function Bar({ width }: BarProps) {
  return (
    <View
      className={pulseClass}
      style={{
        height: 12,
        width,
        borderRadius: 6,
        backgroundColor: theme.pillBackground,
      }}
    />
  );
}

type SkeletonRowProps = {
  sidebarWidth: number | string;
  numericWidth: number | string;
  nameBarWidth: string;
  isHeader?: boolean;
};

function SkeletonRow({
  sidebarWidth,
  numericWidth,
  nameBarWidth,
  isHeader,
}: SkeletonRowProps) {
  return (
    <View
      style={{
        height: ROW_HEIGHT,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 12,
        paddingRight: 12,
        backgroundColor: isHeader
          ? theme.budgetHeaderOtherMonth
          : theme.tableBackground,
      }}
    >
      <View
        style={{
          width: sidebarWidth,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Bar width={nameBarWidth} />
      </View>
      <View
        style={{
          width: numericWidth,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <Bar width="60%" />
      </View>
      <View
        style={{
          width: numericWidth,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <Bar width="70%" />
      </View>
      <View
        style={{
          width: numericWidth,
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <Bar width="50%" />
      </View>
    </View>
  );
}

type SkeletonGroupProps = {
  rowCount: number;
  nameBarWidths: string[];
};

function SkeletonGroup({ rowCount, nameBarWidths }: SkeletonGroupProps) {
  const show3Columns = false;
  const sidebarWidth = getColumnWidth({ show3Columns, isSidebar: true });
  const numericWidth = getColumnWidth({ show3Columns });

  return (
    <Card style={{ marginTop: 4, marginBottom: 4 }}>
      <SkeletonRow
        sidebarWidth={sidebarWidth}
        numericWidth={numericWidth}
        nameBarWidth="55%"
        isHeader
      />
      {Array.from({ length: rowCount }).map((_, i) => (
        <SkeletonRow
          key={i}
          sidebarWidth={sidebarWidth}
          numericWidth={numericWidth}
          nameBarWidth={nameBarWidths[i % nameBarWidths.length]}
        />
      ))}
    </Card>
  );
}

export function BudgetTableSkeleton() {
  return (
    <View
      aria-hidden
      style={{
        flex: 1,
        backgroundColor: theme.mobilePageBackground,
        paddingLeft: 10,
        paddingRight: 10,
      }}
    >
      <SkeletonGroup
        rowCount={4}
        nameBarWidths={['70%', '50%', '80%', '60%']}
      />
      <SkeletonGroup rowCount={3} nameBarWidths={['65%', '75%', '55%']} />
    </View>
  );
}
