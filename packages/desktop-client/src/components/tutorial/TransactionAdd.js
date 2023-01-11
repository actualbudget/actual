import React from 'react';

import { Tooltip, Pointer, P } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';

import { Title } from './common';
import Navigation from './Navigation';

function TransactionAdd({ targetRect, navigationProps }) {
  return (
    <Tooltip
      targetRect={targetRect}
      position="bottom-center"
      width={400}
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
        <Title>Let's add some transactions</Title>
        <P>
          You can add transactions in two ways: import files from your bank or
          manually add individual transactions. You can usually download these
          files straight from your online bank account. (QIF/OFX/QFX is
          supported, sometimes called a "Quicken File")
        </P>

        <P isLast={true}>
          Try <strong>clicking "Add New"</strong> to see how adding transactions
          affects your budget.
        </P>

        <Navigation {...navigationProps} showBack={false} />
      </Pointer>
    </Tooltip>
  );
}

export default TransactionAdd;
