import React from 'react';
import { P } from 'loot-design/src/components/common';
import Navigation from './Navigation';
import { styles, colors } from 'loot-design/src/style';
import { Standalone, Title } from './common';

function DeleteTransactions({ targetRect, navigationProps }) {
  return (
    <Standalone width={500}>
      <Title>Deleting transactions</Title>
      <P isLast={true}>
        Let's cleanup the fake transactions we added. You can delete
        transactions by hovering over them and clicking the "X" beside them.
      </P>
      <Navigation {...navigationProps} showBack={false} />
    </Standalone>
  );
}

export default DeleteTransactions;
