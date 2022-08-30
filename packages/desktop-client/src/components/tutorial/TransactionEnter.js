import React from 'react';
import { P } from 'loot-design/src/components/common';
import * as monthUtils from 'loot-core/src/shared/months';
import Navigation from './Navigation';
import { Standalone, Title } from './common';

function TransactionEnter({ fromYNAB, navigationProps }) {
  const currentDay = monthUtils.currentDay();

  return (
    <Standalone width={400}>
      <Title>Add a transaction</Title>
      <P>
        Categorize the new transaction (you can use anything, try "Food") and
        enter any amount in the "payment" column. You'll see how it affects the
        budget.
      </P>

      <P>
        Next, try adding an income transaction by categorizing a new transaction
        as "Income" and entering an amount in the "deposit" column.
      </P>

      <Navigation {...navigationProps} />
    </Standalone>
  );
}

export default TransactionEnter;
