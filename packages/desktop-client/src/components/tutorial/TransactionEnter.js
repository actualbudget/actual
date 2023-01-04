import React from 'react';

import { P } from 'loot-design/src/components/common';

import { Standalone, Title } from './common';
import Navigation from './Navigation';

function TransactionEnter({ navigationProps }) {
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
