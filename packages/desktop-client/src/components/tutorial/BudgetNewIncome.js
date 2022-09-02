import React from 'react';

import { Tooltip, Pointer, P } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { Title } from './common';
import Navigation from './Navigation';

function BudgetSummary({ targetRect, navigationProps }) {
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
        color={colors.n1}
        pointerPosition="center"
        innerStyle={{ padding: 20 }}
      >
        <Title>More money!</Title>
        <P>
          If you added any deposit transactions, you'll see that you have more
          money to budget. Any income becomes{' '}
          <strong>immediately available</strong> to budget. Hooray!
        </P>

        <P isLast={true}>
          If you've already budgeted all you need this month, you can click the
          "To Budget" amount and select "Hold for next month". This puts the
          money away for next month.
        </P>
        <Navigation {...navigationProps} showBack={false} />
      </Pointer>
    </Tooltip>
  );
}

export default BudgetSummary;
