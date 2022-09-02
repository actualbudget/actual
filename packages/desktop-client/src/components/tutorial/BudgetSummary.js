import React from 'react';

import { Tooltip, Pointer, P } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { Title } from './common';
import Navigation from './Navigation';

function BudgetSummary({ fromYNAB, targetRect, navigationProps }) {
  return (
    <Tooltip
      targetRect={targetRect}
      position="bottom-center"
      width={450}
      style={{
        border: 'none',
        backgroundColor: 'transparent',
        color: colors.n1,
        boxShadow: 'none',
        marginTop: 5,
        fontSize: 14
      }}
    >
      <Pointer
        backgroundColor="white"
        pointerPosition="center"
        innerStyle={{ padding: 20 }}
      >
        <Title>Budget Overview</Title>

        <P>
          Actual uses a system where{' '}
          <strong>you can only budget money that you currently have</strong>.
        </P>

        <P isLast={!fromYNAB}>
          This is a summary of what money you have to budget and how Actual
          calculated it. It's your current income (including anything leftover
          from last month) minus any overspending from last month and any
          already budgeted amount.
        </P>

        {fromYNAB && (
          <P isLast={true}>
            Since you're coming from YNAB 4, an important distinction is that
            money is always immediately available.
          </P>
        )}

        <Navigation {...navigationProps} showBack={false} />
      </Pointer>
    </Tooltip>
  );
}

export default BudgetSummary;
