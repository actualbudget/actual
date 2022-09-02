import React from 'react';

import { Tooltip, Pointer, P } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { Title } from './common';
import Navigation from './Navigation';

function BudgetInitial({ targetRect, navigationProps }) {
  return (
    <Tooltip
      targetRect={targetRect}
      position="left-center"
      width={300}
      style={{
        border: 'none',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        transform: 'translateX(-5px)',
        fontSize: 14
      }}
    >
      <Pointer
        backgroundColor="white"
        color={colors.n1}
        pointerPosition="center"
        pointerDirection="right"
        innerStyle={{ padding: 20 }}
      >
        <Title>This is where you budget money for the current month</Title>

        <P>
          As money comes in, you put it in categories. As money is spent, you
          can see each categories' balance.
        </P>

        <P isLast={true}>
          Don't overthink categories. If you haven't budgeted before, start with
          just a few.
        </P>
        <Navigation {...navigationProps} />
      </Pointer>
    </Tooltip>
  );
}

export default BudgetInitial;
